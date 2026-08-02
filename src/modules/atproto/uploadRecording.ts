import type { PublicNoteBlob } from "@/modules/atproto/publicNote.types"
import { RECORDING_COLLECTION } from "@/modules/atproto/recording.types"
import { getActiveSession } from "@/modules/atproto/service/atprotoOAuth"

interface UploadRecordingParams {
  did: string
  file: File
  title: string
  durationSec?: number
  /**
   * Overrides `file.type` for the upload. Android's file picker hands back an
   * empty or generic MIME for some containers, and the lexicon's blob accept is
   * ["audio/*"] — an untyped blob would fail record validation.
   */
  mimeType?: string
  /**
   * The rkey to write the record at, which is the rkey of the note this
   * recording belongs to. Absent means the note has never been published and
   * has no rkey to share: the PDS assigns a TID and the caller falls back to
   * embedding the at-uri in the markdown.
   */
  rkey?: string
}

export type UploadRecordingResult =
  | { ok: true; uri: string }
  | { ok: false; reason: "no-session" }
  | { ok: false; reason: "upload-failed"; detail: string }
  | { ok: false; reason: "record-failed"; detail: string }
  | { ok: false; reason: "exception"; detail: string }

/**
 * XRPC errors come back as `{ error, message }`. That body is the only thing
 * that distinguishes BlobTooLarge from InvalidMimeType from an expired token,
 * so it gets surfaced to the user rather than swallowed into a console warning
 * nobody reads on a phone.
 */
const describeFailure = async (response: Response): Promise<string> => {
  const status = response.status
  try {
    const body = (await response.json()) as { error?: string; message?: string }
    const parts = [body.error, body.message].filter(Boolean)
    return parts.length ? `${status} ${parts.join(": ")}` : `HTTP ${status}`
  } catch {
    return `HTTP ${status}`
  }
}

/**
 * Put an audio file in the author's PDS and return the at-uri of the record.
 *
 * With an `rkey`, putRecord writes the recording at the note's own rkey — that
 * shared rkey *is* the attachment, the only thing that says this audio belongs
 * to that note, and it leaves the markdown untouched. Overwriting is the
 * wanted behaviour: a second take replaces the first rather than leaving two
 * recordings and no way to tell which one the note means. Without an rkey the
 * note has never been published, so createRecord takes a PDS-assigned TID and
 * the caller embeds the at-uri in the markdown as before.
 *
 * The record is written immediately after the upload on purpose: an
 * unreferenced blob is temporary and gets garbage collected, with roughly an
 * hour of grace. The reference cannot wait for the publish cycle.
 *
 * A failed upload leaves nothing behind; a failed write leaves an orphan blob
 * that the PDS collects on its own.
 */
export const uploadRecording = async ({
  did,
  file,
  title,
  durationSec,
  mimeType,
  rkey
}: UploadRecordingParams): Promise<UploadRecordingResult> => {
  const session = await getActiveSession(did)
  if (!session) return { ok: false, reason: "no-session" }

  try {
    const uploaded = await session.fetchHandler(
      "/xrpc/com.atproto.repo.uploadBlob",
      {
        method: "POST",
        headers: { "Content-Type": mimeType || file.type },
        body: file
      }
    )

    if (!uploaded.ok) {
      const detail = await describeFailure(uploaded)
      console.warn("uploadRecording: uploadBlob failed", detail)
      return { ok: false, reason: "upload-failed", detail }
    }

    const { blob } = (await uploaded.json()) as { blob: PublicNoteBlob }

    const write = rkey ? "putRecord" : "createRecord"
    const created = await session.fetchHandler(
      `/xrpc/com.atproto.repo.${write}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: did,
          collection: RECORDING_COLLECTION,
          ...(rkey ? { rkey } : {}),
          record: {
            audio: blob,
            title,
            ...(durationSec ? { durationSec } : {}),
            createdAt: new Date().toISOString()
          }
        })
      }
    )

    if (!created.ok) {
      const detail = await describeFailure(created)
      console.warn(`uploadRecording: ${write} failed`, detail)
      return { ok: false, reason: "record-failed", detail }
    }

    const { uri } = (await created.json()) as { uri: string }
    if (!uri) {
      return { ok: false, reason: "record-failed", detail: "no uri returned" }
    }
    return { ok: true, uri }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.warn("uploadRecording: failed", error)
    return { ok: false, reason: "exception", detail }
  }
}

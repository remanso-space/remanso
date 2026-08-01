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
}

/**
 * Put an audio file in the author's PDS and return the at-uri that the note
 * markdown will point at.
 *
 * The record is created immediately after the upload on purpose: an
 * unreferenced blob is temporary and gets garbage collected, with roughly an
 * hour of grace. The reference cannot wait for the publish cycle.
 *
 * Returns null on any failure. A failed upload leaves nothing behind; a failed
 * createRecord leaves an orphan blob that the PDS collects on its own.
 */
export const uploadRecording = async ({
  did,
  file,
  title,
  durationSec,
  mimeType
}: UploadRecordingParams): Promise<string | null> => {
  const session = await getActiveSession(did)
  if (!session) return null

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
      console.warn("uploadRecording: uploadBlob failed", uploaded.status)
      return null
    }

    const { blob } = (await uploaded.json()) as { blob: PublicNoteBlob }

    const created = await session.fetchHandler(
      "/xrpc/com.atproto.repo.createRecord",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: did,
          collection: RECORDING_COLLECTION,
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
      console.warn("uploadRecording: createRecord failed", created.status)
      return null
    }

    const { uri } = (await created.json()) as { uri: string }
    return uri ?? null
  } catch (error) {
    console.warn("uploadRecording: failed", error)
    return null
  }
}

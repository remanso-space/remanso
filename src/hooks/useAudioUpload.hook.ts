import { type Ref, toValue } from "vue"

import { MAX_RECORDING_BYTES } from "@/modules/atproto/recording.types"
import {
  uploadRecording,
  type UploadRecordingResult
} from "@/modules/atproto/uploadRecording"
import { noteTitleForAlt } from "@/utils/noteTitleForAlt"
import { errorMessage } from "@/utils/notif"

// A getter is in the union because the ATProto DID arrives as Ref<string | null>
// from useATProtoLogin, and Ref is invariant — Ref<string | null> will not
// assign to Ref<string | undefined>. `toValue` unwraps all three forms.
type MaybeRef =
  | Ref<string | undefined>
  | (() => string | undefined)
  | string
  | undefined

const megabytes = (bytes: number) => Math.round(bytes / 1_000_000)

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  amr: "audio/amr",
  awb: "audio/amr-wb",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  weba: "audio/webm"
}

/**
 * Settle on a MIME type for the upload.
 *
 * Android's Storage Access Framework reports an empty or generic MIME for
 * several audio containers, so a file picked out of Downloads can arrive with
 * no usable `type`. The lexicon's blob accept is ["audio/*"], so an untyped
 * blob would fail record validation — fall back to the extension.
 *
 * Returns null when the file is not audio by either signal.
 */
const audioMimeType = (file: File): string | null => {
  if (file.type.startsWith("audio/")) return file.type
  if (file.type && file.type !== "application/octet-stream") return null

  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return AUDIO_MIME_BY_EXTENSION[extension] ?? null
}

/**
 * Read the playback length without decoding the whole file. Best effort: some
 * browsers report Infinity for a streamed container, and the record simply
 * omits durationSec in that case.
 */
const readDuration = (file: File): Promise<number | undefined> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()

    const finish = (value?: number) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }

    audio.addEventListener("loadedmetadata", () => {
      const seconds = audio.duration
      finish(Number.isFinite(seconds) ? Math.round(seconds) : undefined)
    })
    audio.addEventListener("error", () => finish(undefined))

    audio.preload = "metadata"
    audio.src = url
  })

/**
 * One message per cause. A single "upload failed" string covered an expired
 * OAuth session, a PDS size rejection and a lexicon validation error alike,
 * which made the feature undebuggable from a phone.
 */
const failureMessage = (
  failure: Extract<UploadRecordingResult, { ok: false }>
): string => {
  switch (failure.reason) {
    case "no-session":
      return "❌ ATProto session expired — sign out and back in"
    case "upload-failed":
      return `❌ The PDS rejected the audio (${failure.detail})`
    case "record-failed":
      return `❌ Audio uploaded but the recording record failed (${failure.detail})`
    case "exception":
      return `❌ Audio upload failed: ${failure.detail}`
  }
}

export const useAudioUpload = ({
  did,
  notePath,
  noteContent
}: {
  did: MaybeRef
  notePath: MaybeRef
  noteContent: MaybeRef
}) => {
  /**
   * `durationSec` overrides the metadata probe. A MediaRecorder take has no
   * duration in its container header, so an in-app recording reports Infinity
   * and would lose its length — the recorder's own elapsed count is the only
   * reliable source there.
   */
  const attachAudio = async (
    file: File,
    options?: { durationSec?: number }
  ): Promise<{ markdown: string } | null> => {
    const path = toValue(notePath)
    if (!path) {
      errorMessage("❌ No note to attach the audio to")
      return null
    }

    const authorDid = toValue(did)
    if (!authorDid) {
      errorMessage("❌ Sign in to ATProto first")
      return null
    }

    const mimeType = audioMimeType(file)
    if (!mimeType) {
      errorMessage("❌ That file isn't audio")
      return null
    }

    if (file.size > MAX_RECORDING_BYTES) {
      errorMessage(
        `❌ Audio is ${megabytes(file.size)}MB, over the ${megabytes(
          MAX_RECORDING_BYTES
        )}MB limit. Re-encode it: ffmpeg -i in.wav -c:a aac -b:a 64k -ac 1 out.m4a`
      )
      return null
    }

    const title = noteTitleForAlt(toValue(noteContent) ?? "", path)
    const durationSec = options?.durationSec || (await readDuration(file))

    const result = await uploadRecording({
      did: authorDid,
      file,
      title,
      durationSec,
      mimeType
    })

    if (!result.ok) {
      errorMessage(failureMessage(result))
      return null
    }

    return { markdown: `![${title}](${result.uri})` }
  }

  return { attachAudio }
}

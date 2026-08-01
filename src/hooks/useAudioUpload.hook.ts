import { type Ref, toValue } from "vue"

import { MAX_RECORDING_BYTES } from "@/modules/atproto/recording.types"
import { uploadRecording } from "@/modules/atproto/uploadRecording"
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

export const useAudioUpload = ({
  did,
  notePath,
  noteContent
}: {
  did: MaybeRef
  notePath: MaybeRef
  noteContent: MaybeRef
}) => {
  const attachAudio = async (
    file: File
  ): Promise<{ markdown: string } | null> => {
    const path = toValue(notePath)
    const authorDid = toValue(did)
    if (!path || !authorDid) {
      errorMessage("❌ Audio upload failed")
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
    const durationSec = await readDuration(file)

    const atUri = await uploadRecording({
      did: authorDid,
      file,
      title,
      durationSec,
      mimeType
    })
    if (!atUri) {
      errorMessage("❌ Audio upload failed")
      return null
    }

    return { markdown: `![${title}](${atUri})` }
  }

  return { attachAudio }
}

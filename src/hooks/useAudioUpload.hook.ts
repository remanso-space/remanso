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

    if (!file.type.startsWith("audio/")) {
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
      durationSec
    })
    if (!atUri) {
      errorMessage("❌ Audio upload failed")
      return null
    }

    return { markdown: `![${title}](${atUri})` }
  }

  return { attachAudio }
}

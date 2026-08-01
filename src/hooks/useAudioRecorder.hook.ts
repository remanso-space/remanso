import { computed, onScopeDispose, ref, shallowRef, watch } from "vue"

/**
 * Ordered by playback reach, not by encoder quality. Safari below 18.4 cannot
 * play WebM/Opus, so an MP4/AAC take is the one that plays on every browser —
 * take it whenever the recorder can produce it. Firefox only offers WebM or Ogg
 * and lands further down the list.
 */
const MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus"
]

const EXTENSION_BY_CONTAINER: Record<string, string> = {
  mp4: "m4a",
  webm: "weba",
  ogg: "ogg"
}

// 32 kbps mono is more than enough for speech and keeps an hour of audio near
// 14MB, well inside the 50MB blob ceiling.
const AUDIO_BITS_PER_SECOND = 32_000

/**
 * A browser tab is not a field recorder: backgrounding it on mobile can kill
 * the stream, and the chunks only live in memory. Stopping at an hour bounds
 * what a forgotten tab can lose — a long stream belongs in the file picker
 * path, where it was captured by a real recorder first.
 */
export const MAX_RECORDING_SEC = 60 * 60

const TICK_MS = 250

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "ready"
  | "denied"
  | "unsupported"

/**
 * First container the browser will actually encode, or null when MediaRecorder
 * is missing or offers none of them.
 */
export const pickMimeType = (): string | null => {
  if (typeof MediaRecorder === "undefined") return null
  if (typeof MediaRecorder.isTypeSupported !== "function") return null
  return (
    MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
  )
}

/** `audio/webm;codecs=opus` → `weba`. Falls back to the container name. */
const extensionFor = (mimeType: string): string => {
  const container = mimeType.split(";")[0]?.split("/")[1] ?? "webm"
  return EXTENSION_BY_CONTAINER[container] ?? container
}

/**
 * Capture audio from the microphone into a File the upload path can take as-is.
 *
 * The File carries an `audio/*` type even though the PDS will sniff the
 * container and may store it as `video/webm` or `video/mp4` — the lexicon
 * accepts those for exactly that reason.
 */
export const useAudioRecorder = () => {
  const state = ref<RecorderState>("idle")
  const elapsedSec = ref(0)
  const previewUrl = ref<string | null>(null)
  const take = shallowRef<File | null>(null)

  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let ticker: ReturnType<typeof setInterval> | null = null
  let mimeType = ""
  // Wall-clock rather than a tick count: a throttled background tab fires the
  // interval late and often, and the timer must still match the audio.
  let resumedAt = 0
  let accumulatedMs = 0

  const isCapturing = computed(
    () => state.value === "recording" || state.value === "paused"
  )

  const stopTicker = () => {
    if (ticker) clearInterval(ticker)
    ticker = null
  }

  const startTicker = () => {
    stopTicker()
    resumedAt = Date.now()
    ticker = setInterval(() => {
      elapsedSec.value = Math.floor(
        (accumulatedMs + Date.now() - resumedAt) / 1000
      )
      if (elapsedSec.value >= MAX_RECORDING_SEC) stop()
    }, TICK_MS)
  }

  // Releasing the tracks is what clears the browser's recording indicator. Skip
  // it and the tab keeps holding the mic open after the take is done.
  const releaseStream = () => {
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  const finish = () => {
    stopTicker()
    releaseStream()

    const blob = new Blob(chunks, { type: mimeType })
    chunks = []
    recorder = null

    if (!blob.size) {
      state.value = "idle"
      return
    }

    // Strip the codecs parameter: it goes out as the upload's Content-Type, and
    // a bare container type is what the PDS expects.
    const type = mimeType.split(";")[0]
    take.value = new File([blob], `recording.${extensionFor(mimeType)}`, {
      type
    })
    previewUrl.value = URL.createObjectURL(blob)
    state.value = "ready"
  }

  const reset = () => {
    stopTicker()
    if (recorder && recorder.state !== "inactive") {
      // Drop the handler first so a discard doesn't produce a take.
      recorder.onstop = null
      recorder.stop()
    }
    recorder = null
    releaseStream()
    chunks = []

    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
    take.value = null
    elapsedSec.value = 0
    accumulatedMs = 0
    state.value = "idle"
  }

  const start = async (): Promise<boolean> => {
    const type = pickMimeType()
    if (!type) {
      state.value = "unsupported"
      return false
    }

    reset()
    state.value = "requesting"

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      // NotAllowedError is a refused prompt or a blocked origin; anything else
      // (NotFoundError, insecure context) means the mic isn't usable at all.
      state.value = name === "NotAllowedError" ? "denied" : "unsupported"
      console.warn("useAudioRecorder: getUserMedia failed", error)
      return false
    }

    try {
      recorder = new MediaRecorder(stream, {
        mimeType: type,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND
      })
    } catch (error) {
      releaseStream()
      state.value = "unsupported"
      console.warn("useAudioRecorder: MediaRecorder rejected", type, error)
      return false
    }

    mimeType = type
    chunks = []
    accumulatedMs = 0
    elapsedSec.value = 0

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.onstop = finish

    // A timeslice keeps chunks flowing instead of buffering the whole take in
    // the encoder, so a stop always has data even for a long recording.
    recorder.start(1000)
    state.value = "recording"
    startTicker()
    return true
  }

  const pause = () => {
    if (recorder?.state !== "recording") return
    recorder.pause()
    accumulatedMs += Date.now() - resumedAt
    stopTicker()
    state.value = "paused"
  }

  const resume = () => {
    if (recorder?.state !== "paused") return
    recorder.resume()
    state.value = "recording"
    startTicker()
  }

  function stop() {
    if (!recorder || recorder.state === "inactive") return
    if (recorder.state === "recording") accumulatedMs += Date.now() - resumedAt
    elapsedSec.value = Math.floor(accumulatedMs / 1000)
    stopTicker()
    recorder.stop()
  }

  // Losing a take to a stray back-swipe is the one failure the user can't undo,
  // since the chunks never touch disk.
  const warnBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault()
    event.returnValue = ""
  }

  const stopGuard = watch(isCapturing, (capturing) => {
    if (capturing) window.addEventListener("beforeunload", warnBeforeUnload)
    else window.removeEventListener("beforeunload", warnBeforeUnload)
  })

  onScopeDispose(() => {
    stopGuard()
    window.removeEventListener("beforeunload", warnBeforeUnload)
    reset()
  })

  return {
    state,
    elapsedSec,
    previewUrl,
    take,
    isCapturing,
    start,
    pause,
    resume,
    stop,
    reset
  }
}

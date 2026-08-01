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

// Fast enough that the bars track speech rather than smearing it, slow enough
// that the whole loop costs nothing. elapsedSec is written on the same tick and
// simply doesn't change on most of them.
const TICK_MS = 50

/** Bars in the rolling level window, oldest first. */
export const LEVEL_BARS = 48

/**
 * Speech sits low in the RMS range — a normal voice lands near 0.05-0.2, which
 * would draw as a flat line against a 0-1 scale. The square root opens up the
 * quiet end, and the gain puts a conversational level around two thirds height.
 */
const levelFromRms = (rms: number) => Math.min(1, Math.sqrt(rms) * 1.8)

const MIC_STORAGE_KEY = "remanso:audio:device"

export interface AudioInput {
  deviceId: string
  label: string
}

/**
 * `name` off anything thrown by getUserMedia. OverconstrainedError is not an
 * Error subclass in every browser, so `instanceof` would miss it.
 */
const errorName = (error: unknown): string =>
  typeof error === "object" && error !== null && "name" in error
    ? String((error as { name: unknown }).name)
    : ""

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
  const levels = ref<number[]>(new Array(LEVEL_BARS).fill(0))
  const devices = ref<AudioInput[]>([])
  // Restored so a chosen microphone survives a reload — picking it again on
  // every note would make an external mic more work than the built-in one.
  const deviceId = ref(localStorage.getItem(MIC_STORAGE_KEY) ?? "")

  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let ticker: ReturnType<typeof setInterval> | null = null
  let mimeType = ""
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  // Explicitly backed by an ArrayBuffer: the bare Uint8Array default widens to
  // ArrayBufferLike, which getByteTimeDomainData will not accept.
  let samples: Uint8Array<ArrayBuffer> | null = null
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

  /**
   * One RMS sample pushed onto the rolling window. Silence still pushes a zero,
   * so the bars scroll steadily and a dead microphone reads as a flat line
   * rather than a frozen one.
   */
  const sampleLevel = () => {
    if (!analyser || !samples) return
    analyser.getByteTimeDomainData(samples)

    let sum = 0
    for (const value of samples) {
      // Byte time-domain data is unsigned, centred on 128.
      const centred = (value - 128) / 128
      sum += centred * centred
    }

    const next = levelFromRms(Math.sqrt(sum / samples.length))
    levels.value = [...levels.value.slice(1), next]
  }

  const startTicker = () => {
    stopTicker()
    resumedAt = Date.now()
    ticker = setInterval(() => {
      elapsedSec.value = Math.floor(
        (accumulatedMs + Date.now() - resumedAt) / 1000
      )
      sampleLevel()
      if (elapsedSec.value >= MAX_RECORDING_SEC) stop()
    }, TICK_MS)
  }

  /**
   * The analyser only taps the stream — it is deliberately never connected to
   * the context destination, which would play the microphone back through the
   * speakers and feed back.
   */
  const startMetering = (source: MediaStream) => {
    if (typeof AudioContext === "undefined") return
    try {
      audioContext = new AudioContext()
      // Safari starts a context suspended unless it was created in a gesture;
      // start() always runs from a click, but resuming costs nothing.
      void audioContext.resume?.()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      audioContext.createMediaStreamSource(source).connect(analyser)
      samples = new Uint8Array(analyser.fftSize)
    } catch (error) {
      // Metering is decoration. A context the browser refuses to open must not
      // cost the user their recording.
      console.warn("useAudioRecorder: level metering unavailable", error)
      analyser = null
      samples = null
    }
  }

  const stopMetering = () => {
    analyser = null
    samples = null
    void audioContext?.close?.()
    audioContext = null
    levels.value = new Array(LEVEL_BARS).fill(0)
  }

  // Releasing the tracks is what clears the browser's recording indicator. Skip
  // it and the tab keeps holding the mic open after the take is done.
  const releaseStream = () => {
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  const finish = () => {
    stopTicker()
    stopMetering()
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
    stopMetering()
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

  const selectDevice = (id: string) => {
    deviceId.value = id
    if (id) localStorage.setItem(MIC_STORAGE_KEY, id)
    else localStorage.removeItem(MIC_STORAGE_KEY)
  }

  /**
   * List the microphones the browser will admit to.
   *
   * Labels are blank until a mic has been granted at least once on the origin,
   * and a browser with no permission reports a single anonymous entry. Numbered
   * placeholders keep the picker usable in that state, and the stale-device
   * prune is held back until the labels prove a grant has happened — otherwise
   * the first call would throw away a perfectly good saved choice.
   */
  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const inputs = all.filter((device) => device.kind === "audioinput")

      devices.value = inputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`
      }))

      const labelled = inputs.some((device) => device.label)
      const stillThere = inputs.some(
        (device) => device.deviceId === deviceId.value
      )
      if (labelled && deviceId.value && !stillThere) selectDevice("")
    } catch (error) {
      console.warn("useAudioRecorder: could not list microphones", error)
    }
  }

  /**
   * `exact` rather than `ideal`: silently recording off the phone's built-in
   * mic when the chosen one is busy would be worse than failing. The one case
   * worth absorbing is a saved mic that is simply not plugged in any more.
   */
  const openStream = async (): Promise<MediaStream> => {
    const constraint: MediaTrackConstraints | true = deviceId.value
      ? { deviceId: { exact: deviceId.value } }
      : true

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: constraint })
    } catch (error) {
      const name = errorName(error)
      const missing =
        name === "OverconstrainedError" || name === "NotFoundError"
      if (!deviceId.value || !missing) throw error

      console.warn("useAudioRecorder: saved microphone is gone, using default")
      selectDevice("")
      return navigator.mediaDevices.getUserMedia({ audio: true })
    }
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
      stream = await openStream()
    } catch (error) {
      // NotAllowedError is a refused prompt or a blocked origin; anything else
      // (NotFoundError, insecure context) means the mic isn't usable at all.
      state.value =
        errorName(error) === "NotAllowedError" ? "denied" : "unsupported"
      console.warn("useAudioRecorder: getUserMedia failed", error)
      return false
    }

    // The grant that just happened is what fills in the device labels, so the
    // picker is only genuinely readable from here on.
    void refreshDevices()

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
    startMetering(stream)

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

  // Plugging the microphone in while the modal is already open should populate
  // the picker without a reopen.
  const onDeviceChange = () => void refreshDevices()
  navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange)

  onScopeDispose(() => {
    stopGuard()
    window.removeEventListener("beforeunload", warnBeforeUnload)
    navigator.mediaDevices?.removeEventListener?.(
      "devicechange",
      onDeviceChange
    )
    reset()
  })

  return {
    state,
    elapsedSec,
    previewUrl,
    take,
    levels,
    devices,
    deviceId,
    isCapturing,
    selectDevice,
    refreshDevices,
    start,
    pause,
    resume,
    stop,
    reset
  }
}

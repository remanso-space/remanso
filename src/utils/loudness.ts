/**
 * Loudness estimation, ITU-R BS.1770 K-weighting.
 *
 * This is an estimate, not a conformant measurement. A conformant integrated
 * loudness needs every sample of the programme; we measure from an AnalyserNode
 * polled on a timer, which samples the signal rather than covering it. For a
 * single speaker on one microphone that lands within a decibel or two — enough
 * to stop one take being 18 dB quieter than the next, which is the actual
 * problem. It is not enough to certify a master against a broadcast spec.
 */

/** Apple Podcasts' integrated target. Spotify normalises to -14 on its own. */
export const TARGET_LUFS = -16

/**
 * Windows quieter than this are room tone, not speech, and would drag the mean
 * down. BS.1770 calls this the absolute gate; the spec puts it at -70 LUFS, but
 * a browser capture has a higher noise floor than a studio feed.
 */
export const SILENCE_GATE_LUFS = -60

/** Gain the calibration is allowed to apply, either way. */
export const MIN_GAIN_DB = -12
export const MAX_GAIN_DB = 24

interface Biquad {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

/**
 * The two K-weighting stages: a high shelf standing in for the head's acoustic
 * response, then a high-pass. Coefficients are derived for the actual sample
 * rate rather than hardcoded for 48 kHz, since a browser may hand us 44.1.
 */
const kWeighting = (sampleRate: number): [Biquad, Biquad] => {
  const shelfF0 = 1681.974450955533
  const shelfGain = 3.999843853973347
  const shelfQ = 0.7071752369554196

  const k = Math.tan((Math.PI * shelfF0) / sampleRate)
  const vh = Math.pow(10, shelfGain / 20)
  const vb = Math.pow(vh, 0.4996667741545416)
  const shelfDen = 1 + k / shelfQ + k * k

  const shelf: Biquad = {
    b0: (vh + (vb * k) / shelfQ + k * k) / shelfDen,
    b1: (2 * (k * k - vh)) / shelfDen,
    b2: (vh - (vb * k) / shelfQ + k * k) / shelfDen,
    a1: (2 * (k * k - 1)) / shelfDen,
    a2: (1 - k / shelfQ + k * k) / shelfDen
  }

  const hpF0 = 38.13547087602444
  const hpQ = 0.5003270373238773
  const hpK = Math.tan((Math.PI * hpF0) / sampleRate)
  const hpDen = 1 + hpK / hpQ + hpK * hpK

  const highpass: Biquad = {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (hpK * hpK - 1)) / hpDen,
    a2: (1 - hpK / hpQ + hpK * hpK) / hpDen
  }

  return [shelf, highpass]
}

interface BiquadState {
  x1: number
  x2: number
  y1: number
  y2: number
}

const freshState = (): BiquadState => ({ x1: 0, x2: 0, y1: 0, y2: 0 })

const step = (filter: Biquad, state: BiquadState, x: number): number => {
  const y =
    filter.b0 * x +
    filter.b1 * state.x1 +
    filter.b2 * state.x2 -
    filter.a1 * state.y1 -
    filter.a2 * state.y2

  state.x2 = state.x1
  state.x1 = x
  state.y2 = state.y1
  state.y1 = y
  return y
}

export interface LoudnessEstimator {
  /** Feed one window of time-domain samples, -1 to 1. */
  push: (window: Float32Array) => void
  /** Windows loud enough to count as speech. */
  readonly speechWindows: number
  /** Estimated loudness in LUFS, or null before any speech was heard. */
  lufs: () => number | null
}

export const createLoudnessEstimator = (
  sampleRate: number
): LoudnessEstimator => {
  const [shelf, highpass] = kWeighting(sampleRate)
  // Filter state persists across windows. The windows are not contiguous, so
  // each carries a small discontinuity — negligible against a window of
  // thousands of samples, and cheaper than warming the filter up every time.
  const shelfState = freshState()
  const highpassState = freshState()

  const kept: number[] = []

  const loudnessOf = (meanSquare: number) =>
    -0.691 + 10 * Math.log10(meanSquare)

  const meanLoudness = (squares: number[]) =>
    loudnessOf(squares.reduce((sum, value) => sum + value, 0) / squares.length)

  return {
    push(window) {
      if (!window.length) return

      let sum = 0
      for (const sample of window) {
        const filtered = step(
          highpass,
          highpassState,
          step(shelf, shelfState, sample)
        )
        sum += filtered * filtered
      }

      const meanSquare = sum / window.length
      if (meanSquare <= 0) return
      if (loudnessOf(meanSquare) < SILENCE_GATE_LUFS) return

      kept.push(meanSquare)
    },

    get speechWindows() {
      return kept.length
    },

    lufs() {
      if (!kept.length) return null

      // BS.1770's relative gate. Without it the filters' ringing decaying into
      // the silence after a phrase counts as programme material and drags the
      // measurement down — measurably, by a couple of tenths on a take with
      // long pauses.
      const threshold = meanLoudness(kept) - 10
      const gated = kept.filter((square) => loudnessOf(square) >= threshold)

      return gated.length ? meanLoudness(gated) : meanLoudness(kept)
    }
  }
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

/**
 * The correction to fold into the capture gain after a take.
 *
 * `appliedDb` is the gain that take was already recorded with, so the result is
 * a cumulative offset rather than a fresh guess: measuring -20 LUFS on a take
 * that already had +6 dB means the microphone itself sits at -26, and the
 * offset converges in one step instead of oscillating.
 */
export const nextGainDb = (
  measuredLufs: number,
  appliedDb: number,
  target = TARGET_LUFS
): number =>
  clamp(appliedDb + (target - measuredLufs), MIN_GAIN_DB, MAX_GAIN_DB)

export const dbToAmplitude = (db: number): number => Math.pow(10, db / 20)

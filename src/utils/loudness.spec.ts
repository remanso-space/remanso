import { describe, expect, it } from "vitest"

import {
  createLoudnessEstimator,
  dbToAmplitude,
  MAX_GAIN_DB,
  MIN_GAIN_DB,
  nextGainDb,
  TARGET_LUFS
} from "@/utils/loudness"

const SAMPLE_RATE = 48_000

/** One window of a sine at `hz`, peaking at `amplitude`. */
const tone = (hz: number, amplitude: number, length = 4096): Float32Array => {
  const window = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    window[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE)
  }
  return window
}

const measure = (window: Float32Array, repeats = 40): number | null => {
  const estimator = createLoudnessEstimator(SAMPLE_RATE)
  for (let i = 0; i < repeats; i += 1) estimator.push(window)
  return estimator.lufs()
}

describe("createLoudnessEstimator", () => {
  // BS.1770's own calibration case: a 1 kHz sine at -20 dBFS reads -20 LUFS,
  // because K-weighting is flat to within a fraction of a dB at 1 kHz.
  it("reads a 1 kHz tone at its dBFS level", () => {
    const rms = dbToAmplitude(-20)
    const measured = measure(tone(1000, rms * Math.SQRT2))

    expect(measured).toBeCloseTo(-20, 0)
  })

  it("tracks a level change decibel for decibel", () => {
    const loud = measure(tone(1000, 0.5))!
    const quiet = measure(tone(1000, 0.05))!

    expect(loud - quiet).toBeCloseTo(20, 0)
  })

  // The high-pass stage is the point of K-weighting: rumble carries power but
  // no loudness, and must not drag the measurement up.
  it("discounts low frequency energy", () => {
    const rumble = measure(tone(20, 0.5))!
    const speech = measure(tone(1000, 0.5))!

    expect(speech - rumble).toBeGreaterThan(10)
  })

  // The filters ring on after a phrase ends, and that decay is loud enough to
  // clear the absolute gate. Only the relative gate keeps it out of the mean.
  it("ignores the silence after speech rather than averaging it in", () => {
    const estimator = createLoudnessEstimator(SAMPLE_RATE)
    const speech = tone(1000, 0.5)

    for (let i = 0; i < 20; i += 1) estimator.push(speech)
    const speechOnly = estimator.lufs()!

    for (let i = 0; i < 200; i += 1) estimator.push(new Float32Array(4096))

    expect(estimator.lufs()).toBeCloseTo(speechOnly, 6)
  })

  it("keeps a quiet passage that is still part of the speech", () => {
    const estimator = createLoudnessEstimator(SAMPLE_RATE)

    // 6 dB down is a softer sentence, not a pause: inside the 10 LU window.
    for (let i = 0; i < 20; i += 1) estimator.push(tone(1000, 0.5))
    for (let i = 0; i < 20; i += 1) estimator.push(tone(1000, 0.25))

    expect(estimator.lufs()!).toBeLessThan(measure(tone(1000, 0.5))!)
  })

  it("reports nothing before it has heard speech", () => {
    const estimator = createLoudnessEstimator(SAMPLE_RATE)

    estimator.push(new Float32Array(4096))

    expect(estimator.lufs()).toBeNull()
    expect(estimator.speechWindows).toBe(0)
  })

  it("survives an empty window", () => {
    const estimator = createLoudnessEstimator(SAMPLE_RATE)

    expect(() => estimator.push(new Float32Array(0))).not.toThrow()
    expect(estimator.lufs()).toBeNull()
  })
})

describe("nextGainDb", () => {
  it("converges in one step from an uncalibrated take", () => {
    // Recorded flat at -26 LUFS: the microphone needs +10 to reach -16.
    expect(nextGainDb(-26, 0)).toBe(10)
  })

  // The measurement is of the already-boosted signal, so the correction has to
  // build on the gain that produced it rather than replace it.
  it("accumulates onto the gain the take was recorded with", () => {
    expect(nextGainDb(-20, 6)).toBe(10)
  })

  it("leaves a take that already hit the target alone", () => {
    expect(nextGainDb(TARGET_LUFS, 4)).toBe(4)
  })

  it("turns a hot take down", () => {
    expect(nextGainDb(-9, 0)).toBe(-7)
  })

  // Amplifying a near-silent take by 40 dB would just make the noise floor
  // loud, and attenuating without limit would bury a take that was simply
  // recorded hot on purpose.
  it("clamps in both directions", () => {
    expect(nextGainDb(-90, 0)).toBe(MAX_GAIN_DB)
    expect(nextGainDb(0, 0)).toBe(MIN_GAIN_DB)
  })
})

describe("dbToAmplitude", () => {
  it.each([
    [0, 1],
    [6, 1.995],
    [-6, 0.501],
    [20, 10]
  ])("converts %i dB", (db, expected) => {
    expect(dbToAmplitude(db)).toBeCloseTo(expected, 2)
  })
})

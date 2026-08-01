import type { InputAudioTrack } from "mediabunny"

import { MAX_RECORDING_BYTES } from "@/modules/atproto/recording.types"
import {
  createLoudnessEstimator,
  dbToAmplitude,
  MAX_GAIN_DB,
  MIN_GAIN_DB,
  TARGET_LUFS
} from "@/utils/loudness"

/**
 * Level an audio file to the podcast loudness target and fit it inside the blob
 * ceiling, by decoding, measuring, applying a single gain, and re-encoding.
 *
 * Unlike the microphone path — which levels at capture time and never
 * re-encodes — an attached file can only be levelled after the fact, so this
 * costs one encode generation. That is worth it against doing nothing at all,
 * which is what an attached file got before.
 *
 * Everything streams: an hour of audio decoded in one go would be most of a
 * gigabyte resident, which a phone will not survive.
 */

/** BS.1770 measures in 400ms blocks; anything else changes where the gates fall. */
const BLOCK_SEC = 0.4

/** Headroom under the true-peak ceiling the platforms ask for. */
const PEAK_CEILING_DBFS = -1

/** Opus at this rate is transparent for speech and generous for anything else. */
const PREFERRED_BITRATE = 96_000

/**
 * Below this the result would be worse than the unprocessed file, so we hand
 * the original back rather than ruin it to make it fit.
 */
const MIN_BITRATE = 32_000

/** Leave room for container overhead when sizing to the blob ceiling. */
const SIZE_SAFETY = 0.9

/**
 * Backstop for the decoder wedging on a malformed input. Generous, because a
 * long file legitimately takes a while on a phone — this is here to stop the
 * attach button being dead forever, not to bound normal work.
 */
const HARD_TIMEOUT_MS = 3 * 60 * 1000

/**
 * A File can report a size larger than the bytes behind it — a download cut
 * short, or Android's picker handing back a stale entry. Mediabunny waits for
 * bytes that never arrive and neither resolves nor throws, so the attach hangs
 * with no way out but a reload. Reading the last byte costs nothing and catches
 * it before the demuxer ever sees the file.
 */
const isTruncated = async (file: File): Promise<boolean> => {
  if (!file.size) return true
  try {
    const tail = await file.slice(file.size - 1).arrayBuffer()
    return tail.byteLength === 0
  } catch {
    return true
  }
}

const withTimeout = async <T>(
  work: Promise<T>,
  ms: number
): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const guard = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn("normalizeAudioFile: gave up after", ms, "ms")
      resolve(null)
    }, ms)
  })

  try {
    return await Promise.race([work, guard])
  } finally {
    clearTimeout(timer)
  }
}

export interface NormalizedAudio {
  file: File
  durationSec: number
  /** What the input measured, before the correction. */
  lufsBefore: number
  gainDb: number
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value))

const amplitudeToDb = (amplitude: number) =>
  amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity

/**
 * A bitrate that lands the encode under the blob ceiling. A 90 minute episode
 * at the preferred rate would not fit, and silently failing the upload later is
 * worse than spending a few kbps.
 */
const bitrateFor = (durationSec: number): number => {
  if (durationSec <= 0) return PREFERRED_BITRATE
  const budget = (MAX_RECORDING_BYTES * 8 * SIZE_SAFETY) / durationSec
  return Math.min(PREFERRED_BITRATE, Math.floor(budget))
}

/**
 * Re-chunks whatever the decoder yields into fixed 400ms blocks, because the
 * BS.1770 gates are defined on blocks of that length and feeding the estimator
 * arbitrary decoder-sized chunks would move the thresholds around.
 */
const createBlocker = (
  channels: number,
  blockSamples: number,
  onBlock: (block: Float32Array[]) => void
) => {
  const pending = Array.from(
    { length: channels },
    () => new Float32Array(blockSamples)
  )
  let filled = 0

  return {
    push(buffer: AudioBuffer) {
      let offset = 0
      while (offset < buffer.length) {
        const take = Math.min(blockSamples - filled, buffer.length - offset)

        for (let channel = 0; channel < channels; channel += 1) {
          pending[channel].set(
            buffer.getChannelData(channel).subarray(offset, offset + take),
            filled
          )
        }

        filled += take
        offset += take

        if (filled === blockSamples) {
          onBlock(pending)
          filled = 0
        }
      }
    }
  }
}

/**
 * Mediabunny carries a demuxer for every container it knows, which is a lot of
 * bytes for a feature most readers never touch. Loading it on first use keeps
 * it off the note view entirely, and narrowing the format list drops the
 * video-only demuxers.
 */
const loadMediabunny = async () => {
  const {
    ADTS,
    AudioBufferSink,
    AudioBufferSource,
    BlobSource,
    BufferTarget,
    canEncodeAudio,
    FLAC,
    Input,
    MATROSKA,
    MP3,
    MP4,
    Output,
    OGG,
    QTFF,
    WAVE,
    WEBM,
    WebMOutputFormat
  } = await import("mediabunny")

  return {
    AudioBufferSink,
    AudioBufferSource,
    BlobSource,
    BufferTarget,
    canEncodeAudio,
    Input,
    Output,
    WebMOutputFormat,
    formats: [MP4, QTFF, MATROSKA, WEBM, MP3, WAVE, OGG, ADTS, FLAC]
  }
}

/** Measures loudness and sample peak in one streamed pass over the track. */
const measure = async (
  AudioBufferSink: Awaited<
    ReturnType<typeof loadMediabunny>
  >["AudioBufferSink"],
  track: InputAudioTrack,
  channels: number
) => {
  const sampleRate = await track.getSampleRate()
  const estimator = createLoudnessEstimator(sampleRate)
  const blocker = createBlocker(
    channels,
    Math.round(sampleRate * BLOCK_SEC),
    (block) => estimator.push(...block)
  )

  let peak = 0

  for await (const { buffer } of new AudioBufferSink(track).buffers()) {
    for (let channel = 0; channel < channels; channel += 1) {
      for (const sample of buffer.getChannelData(channel)) {
        const magnitude = Math.abs(sample)
        if (magnitude > peak) peak = magnitude
      }
    }
    blocker.push(buffer)
  }

  return { lufs: estimator.lufs(), peak }
}

/**
 * Returns null whenever the file is better left alone — the browser cannot
 * encode, the input will not decode, it carries no measurable programme, or it
 * is so long that no acceptable bitrate fits. The caller attaches the original.
 */
export const normalizeAudioFile = async (
  file: File
): Promise<NormalizedAudio | null> => {
  // Before pulling in the demuxers: a file we cannot read is not worth the
  // download, and neither is a browser that cannot encode the result.
  if (await isTruncated(file)) return null

  const mediabunny = await loadMediabunny()
  if (!(await mediabunny.canEncodeAudio("opus"))) return null

  return withTimeout(run(file, mediabunny), HARD_TIMEOUT_MS)
}

const run = async (
  file: File,
  {
    AudioBufferSink,
    AudioBufferSource,
    BlobSource,
    BufferTarget,
    canEncodeAudio,
    Input,
    Output,
    WebMOutputFormat,
    formats
  }: Awaited<ReturnType<typeof loadMediabunny>>
): Promise<NormalizedAudio | null> => {
  try {
    const input = new Input({
      formats,
      source: new BlobSource(file)
    })

    const track = await input.getPrimaryAudioTrack()
    if (!track) return null

    const channels = await track.getNumberOfChannels()
    const sampleRate = await track.getSampleRate()
    const durationSec = await track.computeDuration()

    const bitrate = bitrateFor(durationSec)
    if (bitrate < MIN_BITRATE) return null

    if (
      !(await canEncodeAudio("opus", {
        numberOfChannels: channels,
        sampleRate,
        bitrate
      }))
    ) {
      return null
    }

    const { lufs, peak } = await measure(AudioBufferSink, track, channels)
    if (lufs === null) return null

    // Two ceilings on the correction: the loudness target, and not clipping.
    // Whichever is lower wins, so a hot master gets levelled but never pushed
    // into the encoder's headroom.
    const wanted = TARGET_LUFS - lufs
    const headroom = PEAK_CEILING_DBFS - amplitudeToDb(peak)
    const gainDb = clamp(Math.min(wanted, headroom), MIN_GAIN_DB, MAX_GAIN_DB)

    const output = new Output({
      format: new WebMOutputFormat(),
      target: new BufferTarget()
    })
    const source = new AudioBufferSource({ codec: "opus", bitrate })
    output.addAudioTrack(source)
    await output.start()

    const gain = dbToAmplitude(gainDb)
    // A second pass rather than buffering the first: the whole point is never
    // holding the decoded file in memory. Decoding twice is cheap next to that.
    for await (const { buffer } of new AudioBufferSink(track).buffers()) {
      if (gain !== 1) {
        for (let channel = 0; channel < channels; channel += 1) {
          const samples = buffer.getChannelData(channel)
          for (let i = 0; i < samples.length; i += 1) samples[i] *= gain
        }
      }
      // Awaited to respect encoder backpressure — without it a long file
      // queues faster than it encodes and the memory saving is undone.
      await source.add(buffer)
    }

    await output.finalize()

    const encoded = output.target.buffer
    if (!encoded) return null

    const normalized = new File(
      [encoded],
      file.name.replace(/\.[^.]+$/, "") + ".weba",
      { type: "audio/webm" }
    )

    return { file: normalized, durationSec, lufsBefore: lufs, gainDb }
  } catch (error) {
    console.warn("normalizeAudioFile: leaving the file as it is", error)
    return null
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest"

const canEncodeAudio = vi.fn()
const getPrimaryAudioTrack = vi.fn()

vi.mock("mediabunny", () => ({
  // The real module names each container format; the narrowed list in
  // normalizeAudioFile imports them by name, so the mock has to carry them.
  ADTS: "adts",
  FLAC: "flac",
  MATROSKA: "matroska",
  MP3: "mp3",
  MP4: "mp4",
  OGG: "ogg",
  QTFF: "qtff",
  WAVE: "wave",
  WEBM: "webm",
  canEncodeAudio,
  BlobSource: class {},
  BufferTarget: class {},
  WebMOutputFormat: class {},
  AudioBufferSink: class {
    async *buffers() {}
  },
  AudioBufferSource: class {
    async add() {}
  },
  Input: class {
    getPrimaryAudioTrack = getPrimaryAudioTrack
  },
  Output: class {
    target = { buffer: null }
    addAudioTrack() {}
    async start() {}
    async finalize() {}
  }
}))

const { normalizeAudioFile } = await import("@/utils/normalizeAudioFile")

/** A File whose reported size overstates the bytes actually behind it. */
const truncatedFile = () => {
  const file = new File([new Uint8Array(1)], "cut-short.m4a", {
    type: "audio/mp4"
  })
  Object.defineProperty(file, "size", { value: 5_000_000 })
  return file
}

const honestFile = () =>
  new File([new Uint8Array(2048)], "episode.m4a", { type: "audio/mp4" })

describe("normalizeAudioFile", () => {
  beforeEach(() => {
    canEncodeAudio.mockReset()
    canEncodeAudio.mockResolvedValue(true)
    getPrimaryAudioTrack.mockReset()
    getPrimaryAudioTrack.mockResolvedValue(null)
  })

  // Safari below 26 and Firefox Android have no AudioEncoder. Attaching the
  // file untouched is the behaviour they had before any of this existed.
  it("leaves the file alone when the browser cannot encode", async () => {
    canEncodeAudio.mockResolvedValue(false)

    expect(await normalizeAudioFile(honestFile())).toBeNull()
    expect(getPrimaryAudioTrack).not.toHaveBeenCalled()
  })

  // Mediabunny waits for bytes that never arrive and neither resolves nor
  // throws, which would wedge the attach button until a reload.
  it("refuses a file whose size overstates its content", async () => {
    expect(await normalizeAudioFile(truncatedFile())).toBeNull()
    expect(getPrimaryAudioTrack).not.toHaveBeenCalled()
  })

  it("refuses an empty file", async () => {
    const empty = new File([], "nothing.m4a", { type: "audio/mp4" })

    expect(await normalizeAudioFile(empty)).toBeNull()
    expect(getPrimaryAudioTrack).not.toHaveBeenCalled()
  })

  it("gives up rather than throw when there is no audio track", async () => {
    expect(await normalizeAudioFile(honestFile())).toBeNull()
  })

  it("gives up rather than throw when the input will not demux", async () => {
    getPrimaryAudioTrack.mockRejectedValue(new Error("unrecognizable format"))

    expect(await normalizeAudioFile(honestFile())).toBeNull()
  })
})

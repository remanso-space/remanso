import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAudioUpload } from "@/hooks/useAudioUpload.hook"
import { uploadRecording } from "@/modules/atproto/uploadRecording"
import { normalizeAudioFile } from "@/utils/normalizeAudioFile"
import { errorMessage } from "@/utils/notif"

vi.mock("@/modules/atproto/uploadRecording", () => ({
  uploadRecording: vi.fn()
}))
// The real module pulls in mediabunny, which has no business being loaded to
// test the orchestration around it.
vi.mock("@/utils/normalizeAudioFile", () => ({
  normalizeAudioFile: vi.fn()
}))
vi.mock("@/utils/notif", () => ({
  errorMessage: vi.fn(),
  confirmMessage: vi.fn()
}))

const NOTE = `---
title: Ma 間
---

# Ma 間
`

const makeFile = (size: number, type = "audio/mp4", name = "stream.m4a") => {
  const file = new File([new Uint8Array(1)], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

const subject = () =>
  useAudioUpload({
    did: "did:plc:abc",
    notePath: "japonais/ma.pub.md",
    noteContent: NOTE
  })

describe("useAudioUpload", () => {
  beforeEach(() => {
    vi.mocked(uploadRecording).mockReset()
    vi.mocked(errorMessage).mockReset()
    vi.mocked(normalizeAudioFile).mockReset()
    vi.mocked(normalizeAudioFile).mockResolvedValue(null)

    vi.stubGlobal(
      "Audio",
      class {
        preload = ""
        duration = 3600
        #handlers: Record<string, () => void> = {}
        addEventListener(event: string, handler: () => void) {
          this.#handlers[event] = handler
        }
        set src(_value: string) {
          setTimeout(() => this.#handlers.loadedmetadata?.(), 0)
        }
      }
    )
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => {}
    })
  })

  it("returns the finished markdown line on success", async () => {
    vi.mocked(uploadRecording).mockResolvedValue({
      ok: true,
      uri: "at://did:plc:abc/space.remanso.recording/3xyz"
    })

    const result = await subject().attachAudio(makeFile(1000))

    expect(result).toEqual({
      markdown:
        "![Ma 間 - audio](at://did:plc:abc/space.remanso.recording/3xyz)"
    })
    expect(vi.mocked(uploadRecording).mock.calls[0][0].title).toBe(
      "Ma 間 - audio"
    )
  })

  it("rejects a file over the size ceiling without uploading", async () => {
    const result = await subject().attachAudio(makeFile(50_000_001))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
    expect(errorMessage).toHaveBeenCalled()
  })

  it("rejects a non-audio file without uploading", async () => {
    const result = await subject().attachAudio(
      makeFile(1000, "image/png", "cat.png")
    )

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
    expect(errorMessage).toHaveBeenCalled()
  })

  // Android's SAF reports an empty or generic MIME for several audio
  // containers, so a file picked from Downloads can arrive without a usable
  // `type`. Falling back to the extension keeps those uploadable.
  it.each([
    ["an empty MIME", "", "recording.m4a"],
    ["a generic MIME", "application/octet-stream", "recording.opus"],
    ["an uppercase extension", "", "RECORDING.MP3"],
    ["an amr recording", "", "voice.amr"]
  ])("accepts %s when the extension is audio", async (_label, type, name) => {
    vi.mocked(uploadRecording).mockResolvedValue({
      ok: true,
      uri: "at://did:plc:abc/space.remanso.recording/3xyz"
    })

    const result = await subject().attachAudio(makeFile(1000, type, name))

    expect(result).not.toBeNull()
    expect(uploadRecording).toHaveBeenCalled()
  })

  // The lexicon's blob accept is ["audio/*"], so createRecord rejects a blob
  // uploaded with an empty or generic mimeType. Derive one from the extension.
  it.each([
    ["recording.m4a", "audio/mp4"],
    ["recording.mp3", "audio/mpeg"],
    ["recording.opus", "audio/ogg"],
    ["voice.amr", "audio/amr"],
    ["RECORDING.WAV", "audio/wav"]
  ])("derives an audio mimeType for %s", async (name, expected) => {
    vi.mocked(uploadRecording).mockResolvedValue({
      ok: true,
      uri: "at://did:plc:abc/space.remanso.recording/3xyz"
    })

    await subject().attachAudio(makeFile(1000, "", name))

    expect(vi.mocked(uploadRecording).mock.calls[0][0].mimeType).toBe(expected)
  })

  it("keeps the browser-reported mimeType when there is one", async () => {
    vi.mocked(uploadRecording).mockResolvedValue({
      ok: true,
      uri: "at://did:plc:abc/space.remanso.recording/3xyz"
    })

    await subject().attachAudio(makeFile(1000, "audio/mp4", "stream.m4a"))

    expect(vi.mocked(uploadRecording).mock.calls[0][0].mimeType).toBe(
      "audio/mp4"
    )
  })

  it("rejects an unknown extension with no usable MIME", async () => {
    const result = await subject().attachAudio(
      makeFile(1000, "application/octet-stream", "notes.zip")
    )

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
    expect(errorMessage).toHaveBeenCalled()
  })

  // A single "upload failed" string covered an expired session, a PDS size
  // rejection and a lexicon validation error alike, which made the feature
  // undebuggable from a phone. Each cause now names itself.
  it.each([
    [{ ok: false, reason: "no-session" } as const, /session expired/i],
    [
      {
        ok: false,
        reason: "upload-failed",
        detail: "413 BlobTooLarge"
      } as const,
      /PDS rejected the audio.*BlobTooLarge/i
    ],
    [
      {
        ok: false,
        reason: "record-failed",
        detail: "400 InvalidRequest: wrong mimetype"
      } as const,
      /recording record failed.*InvalidRequest/i
    ],
    [
      { ok: false, reason: "exception", detail: "Failed to fetch" } as const,
      /Failed to fetch/
    ]
  ])("surfaces the %o failure to the user", async (failure, expected) => {
    vi.mocked(uploadRecording).mockResolvedValue(failure)

    expect(await subject().attachAudio(makeFile(1000))).toBeNull()
    expect(vi.mocked(errorMessage).mock.calls[0][0]).toMatch(expected)
  })

  it("distinguishes a missing note from a missing session", async () => {
    await useAudioUpload({
      did: "did:plc:abc",
      notePath: undefined,
      noteContent: NOTE
    }).attachAudio(makeFile(1000))
    expect(vi.mocked(errorMessage).mock.calls[0][0]).toMatch(/No note/i)

    vi.mocked(errorMessage).mockReset()

    await useAudioUpload({
      did: () => undefined,
      notePath: "japonais/ma.pub.md",
      noteContent: NOTE
    }).attachAudio(makeFile(1000))
    expect(vi.mocked(errorMessage).mock.calls[0][0]).toMatch(/Sign in/i)
  })

  it("returns null when the note path is unknown", async () => {
    const result = await useAudioUpload({
      did: "did:plc:abc",
      notePath: undefined,
      noteContent: NOTE
    }).attachAudio(makeFile(1000))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
  })

  describe("levelling an attached file", () => {
    const normalized = (size = 2000) => {
      const file = new File([new Uint8Array(1)], "episode.weba", {
        type: "audio/webm"
      })
      Object.defineProperty(file, "size", { value: size })
      return { file, durationSec: 1800, lufsBefore: -27.4, gainDb: 11.4 }
    }

    beforeEach(() => {
      vi.mocked(uploadRecording).mockResolvedValue({
        ok: true,
        uri: "at://did:plc:abc/space.remanso.recording/3xyz"
      })
    })

    it("uploads the levelled file rather than the original", async () => {
      const result = normalized()
      vi.mocked(normalizeAudioFile).mockResolvedValue(result)

      await subject().attachAudio(makeFile(9_000_000))

      const call = vi.mocked(uploadRecording).mock.calls[0][0]
      expect(call.file).toBe(result.file)
      expect(call.mimeType).toBe("audio/webm")
      expect(call.durationSec).toBe(1800)
    })

    it("falls back to the original when levelling declines", async () => {
      vi.mocked(normalizeAudioFile).mockResolvedValue(null)
      const original = makeFile(9_000_000)

      await subject().attachAudio(original)

      expect(vi.mocked(uploadRecording).mock.calls[0][0].file).toBe(original)
    })

    // Re-encoding is what can bring an oversized episode under the ceiling, so
    // the size check has to judge the output, not the input.
    it("accepts an oversized file that levelling brought under the ceiling", async () => {
      vi.mocked(normalizeAudioFile).mockResolvedValue(normalized(20_000_000))

      const result = await subject().attachAudio(makeFile(80_000_000))

      expect(result).not.toBeNull()
      expect(uploadRecording).toHaveBeenCalled()
    })

    it("still rejects a file too long for any acceptable bitrate", async () => {
      vi.mocked(normalizeAudioFile).mockResolvedValue(null)

      const result = await subject().attachAudio(makeFile(80_000_000))

      expect(result).toBeNull()
      expect(uploadRecording).not.toHaveBeenCalled()
      expect(vi.mocked(errorMessage).mock.calls[0][0]).toMatch(/over the/i)
    })

    // A recording is already levelled by the capture graph; putting it through
    // the encoder again would cost a generation for nothing.
    it("leaves a microphone take out of the encoder", async () => {
      await subject().attachAudio(makeFile(1000), {
        durationSec: 12,
        source: "recording"
      })

      expect(normalizeAudioFile).not.toHaveBeenCalled()
      expect(vi.mocked(uploadRecording).mock.calls[0][0].durationSec).toBe(12)
    })
  })

  it("returns null when the ATProto session has not restored yet", async () => {
    const result = await useAudioUpload({
      did: () => undefined,
      notePath: "japonais/ma.pub.md",
      noteContent: NOTE
    }).attachAudio(makeFile(1000))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
  })
})

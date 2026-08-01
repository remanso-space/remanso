import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAudioUpload } from "@/hooks/useAudioUpload.hook"
import { uploadRecording } from "@/modules/atproto/uploadRecording"
import { errorMessage } from "@/utils/notif"

vi.mock("@/modules/atproto/uploadRecording", () => ({
  uploadRecording: vi.fn()
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
    vi.mocked(uploadRecording).mockResolvedValue(
      "at://did:plc:abc/space.remanso.recording/3xyz"
    )

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
    vi.mocked(uploadRecording).mockResolvedValue(
      "at://did:plc:abc/space.remanso.recording/3xyz"
    )

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
    vi.mocked(uploadRecording).mockResolvedValue(
      "at://did:plc:abc/space.remanso.recording/3xyz"
    )

    await subject().attachAudio(makeFile(1000, "", name))

    expect(vi.mocked(uploadRecording).mock.calls[0][0].mimeType).toBe(expected)
  })

  it("keeps the browser-reported mimeType when there is one", async () => {
    vi.mocked(uploadRecording).mockResolvedValue(
      "at://did:plc:abc/space.remanso.recording/3xyz"
    )

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

  it("returns null and warns when the upload fails", async () => {
    vi.mocked(uploadRecording).mockResolvedValue(null)

    expect(await subject().attachAudio(makeFile(1000))).toBeNull()
    expect(errorMessage).toHaveBeenCalled()
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

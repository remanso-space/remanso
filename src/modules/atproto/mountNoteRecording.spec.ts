import { beforeEach, describe, expect, it, vi } from "vitest"

import { mountNoteRecording } from "@/modules/atproto/mountNoteRecording"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

vi.mock("@/modules/atproto/resolveRecording", () => ({
  resolveRecording: vi.fn()
}))

const AT_URI = "at://did:plc:abc/space.remanso.recording/3labc"

const render = (html: string) => {
  document.body.innerHTML = `<div class="note-content">${html}</div>`
}

const slot = () => document.querySelector(".note-recording-slot")

describe("mountNoteRecording", () => {
  beforeEach(() => {
    vi.mocked(resolveRecording).mockReset()
    vi.mocked(resolveRecording).mockResolvedValue({
      blobUrl: "https://pds/blob",
      title: "Ma 間 - audio",
      durationSec: 42
    })
    document.body.innerHTML = ""
  })

  it("puts the player under the title, above the body", async () => {
    render("<h1>Ma 間</h1><p>Body</p>")

    await mountNoteRecording(".note-content", AT_URI, "Ma 間 - audio")

    const children = Array.from(
      document.querySelector(".note-content")!.children
    )
    expect(children.map((el) => el.tagName)).toEqual(["H1", "DIV", "P"])
    expect(children[1].className).toContain("note-recording-slot")
    expect(document.querySelector("audio")?.getAttribute("src")).toBe(
      "https://pds/blob"
    )
  })

  it("falls back to the top when the note has no heading", async () => {
    render("<p>Body</p>")

    await mountNoteRecording(".note-content", AT_URI, "alt")

    expect(
      document.querySelector(".note-content")!.firstElementChild!.className
    ).toContain("note-recording-slot")
  })

  it("renders nothing when the note has no recording at that rkey", async () => {
    vi.mocked(resolveRecording).mockResolvedValue(null)
    render("<h1>Ma 間</h1><p>Body</p>")

    await mountNoteRecording(".note-content", AT_URI, "alt")

    expect(slot()).toBeNull()
    expect(document.querySelector(".note-content")!.children).toHaveLength(2)
  })

  it("mounts once even if the pass runs again over the same DOM", async () => {
    render("<h1>Ma 間</h1>")

    await mountNoteRecording(".note-content", AT_URI, "alt")
    await mountNoteRecording(".note-content", AT_URI, "alt")

    expect(document.querySelectorAll(".note-recording-slot")).toHaveLength(1)
    expect(resolveRecording).toHaveBeenCalledTimes(1)
  })

  it("does nothing when the container is not on the page", async () => {
    await mountNoteRecording(".note-content", AT_URI, "alt")

    expect(slot()).toBeNull()
    expect(resolveRecording).not.toHaveBeenCalled()
  })

  it("drops the mount when the note re-rendered while resolving", async () => {
    render("<h1>Ma 間</h1>")
    const container = document.querySelector(".note-content")!

    vi.mocked(resolveRecording).mockImplementation(async () => {
      container.remove()
      return { blobUrl: "https://pds/blob" }
    })

    await mountNoteRecording(".note-content", AT_URI, "alt")

    expect(slot()).toBeNull()
  })
})

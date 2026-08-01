import { beforeEach, describe, expect, it, vi } from "vitest"

import { getAuthor } from "@/modules/atproto/getAuthor"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

vi.mock("@/modules/atproto/getAuthor", () => ({
  getAuthor: vi.fn()
}))

const URI = "at://did:plc:abc/space.remanso.recording/3xyz"

const recordResponse = {
  uri: URI,
  cid: "bafyrei111",
  value: {
    audio: {
      $type: "blob",
      ref: { $link: "bafkrei222" },
      mimeType: "audio/mp4",
      size: 1234
    },
    title: "Stream du 12 mai",
    durationSec: 3600,
    createdAt: "2026-05-12T10:00:00Z"
  }
}

describe("resolveRecording", () => {
  beforeEach(() => {
    vi.mocked(getAuthor).mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("resolves to a getBlob URL plus the record metadata", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => recordResponse
    } as unknown as Response)

    const result = await resolveRecording(URI)

    expect(result?.title).toBe("Stream du 12 mai")
    expect(result?.durationSec).toBe(3600)

    const url = new URL(result!.blobUrl)
    expect(url.origin).toBe("https://eurosky.social")
    expect(url.pathname).toBe("/xrpc/com.atproto.sync.getBlob")
    expect(url.searchParams.get("did")).toBe("did:plc:abc")
    expect(url.searchParams.get("cid")).toBe("bafkrei222")
  })

  it("returns null when the collection is not a recording", async () => {
    const result = await resolveRecording(
      "at://did:plc:abc/space.remanso.note/3xyz"
    )

    expect(result).toBeNull()
    expect(getAuthor).not.toHaveBeenCalled()
  })

  it("returns null for a malformed at-uri", async () => {
    expect(await resolveRecording("https://example.com/nope")).toBeNull()
  })

  it("returns null when the author cannot be resolved", async () => {
    vi.mocked(getAuthor).mockResolvedValue(null)

    expect(await resolveRecording(URI)).toBeNull()
  })

  it("returns null when the record fetch fails", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(fetch).mockResolvedValue({ ok: false } as unknown as Response)

    expect(await resolveRecording(URI)).toBeNull()
  })

  it("returns null when the record carries no audio blob", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ uri: URI, cid: "x", value: { createdAt: "now" } })
    } as unknown as Response)

    expect(await resolveRecording(URI)).toBeNull()
  })
})

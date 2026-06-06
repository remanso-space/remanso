import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/modules/atproto/getAuthor", () => ({
  getAuthor: vi.fn()
}))

import { getAuthor } from "@/modules/atproto/getAuthor"

import { getUrl } from "./getUrl"

describe("getUrl", () => {
  beforeEach(() => {
    vi.mocked(getAuthor).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null when the author cannot be resolved", async () => {
    vi.mocked(getAuthor).mockResolvedValue(null)
    expect(
      await getUrl({ did: "did:plc:abc", rkey: "r1" })
    ).toBeNull()
  })

  it("builds a getRecord URL with the right query params on the author's PDS", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "alice.bsky.social",
      pds: "https://pds.example.com"
    })

    const url = await getUrl({ did: "did:plc:abc", rkey: "rkey1" })
    const parsed = new URL(url as string)

    expect(parsed.origin).toBe("https://pds.example.com")
    expect(parsed.pathname).toBe("/xrpc/com.atproto.repo.getRecord")
    expect(parsed.searchParams.get("repo")).toBe("did:plc:abc")
    expect(parsed.searchParams.get("collection")).toBe("space.remanso.note")
    expect(parsed.searchParams.get("rkey")).toBe("rkey1")
  })

  it("passes the did to getAuthor", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "h",
      pds: "https://pds.example.com"
    })

    await getUrl({ did: "did:web:example.com", rkey: "r2" })

    expect(getAuthor).toHaveBeenCalledWith("did:web:example.com")
  })
})

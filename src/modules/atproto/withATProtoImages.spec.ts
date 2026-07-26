import { describe, expect, it } from "vitest"

import { withATProtoImages } from "./withATProtoImages"

const PDS = "https://pds.example.com"
const DID = "did:plc:abc123"

describe("withATProtoImages", () => {
  it("rewrites a bafkrei CID image to a getBlob URL", () => {
    const out = withATProtoImages(
      "![cover](bafkreigh2akiscaildc7r4apx2t6q4t6n6kxjpw3xhqxkfvvbprdaezz4i)",
      { pds: PDS, did: DID }
    )

    expect(out).toContain(`${PDS}/xrpc/com.atproto.sync.getBlob`)
    expect(out).toContain("did=did%3Aplc%3Aabc123")
    expect(out).toContain(
      "cid=bafkreigh2akiscaildc7r4apx2t6q4t6n6kxjpw3xhqxkfvvbprdaezz4i"
    )
  })

  it("preserves the alt text", () => {
    const out = withATProtoImages("![my cover](bafkreiabc)", {
      pds: PDS,
      did: DID
    })
    expect(out).toMatch(/!\[my cover\]/)
  })

  it("rewrites multiple images in one pass", () => {
    const md = "![a](bafkreiaaa) and ![b](bafkreibbb)"
    const out = withATProtoImages(md, { pds: PDS, did: DID })

    expect(out.match(/com\.atproto\.sync\.getBlob/g)).toHaveLength(2)
    expect(out).toContain("cid=bafkreiaaa")
    expect(out).toContain("cid=bafkreibbb")
  })

  it("leaves regular image URLs untouched", () => {
    const md = "![pic](https://example.com/a.png)"
    expect(withATProtoImages(md, { pds: PDS, did: DID })).toBe(md)
  })

  it("leaves CIDs that don't match the bafkrei prefix untouched", () => {
    const md = "![x](sha256-abc123)"
    expect(withATProtoImages(md, { pds: PDS, did: DID })).toBe(md)
  })

  it("preserves an empty alt text", () => {
    const out = withATProtoImages("![](bafkreiabc)", { pds: PDS, did: DID })
    expect(out).toMatch(/^!\[\]/)
  })
})

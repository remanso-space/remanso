import { describe, expect, it } from "vitest"

import { parseAtUri } from "./parseAtUri"

describe("parseAtUri", () => {
  it("parses a did:plc AT URI", () => {
    expect(
      parseAtUri("at://did:plc:abc123/app.bsky.feed.post/rkey-xyz")
    ).toEqual({
      did: "did:plc:abc123",
      collection: "app.bsky.feed.post",
      rkey: "rkey-xyz"
    })
  })

  it("parses a did:web AT URI", () => {
    expect(
      parseAtUri("at://did:web:example.com/space.remanso.note/note-1")
    ).toEqual({
      did: "did:web:example.com",
      collection: "space.remanso.note",
      rkey: "note-1"
    })
  })

  it("treats rkeys with slashes as a single trailing segment", () => {
    expect(
      parseAtUri("at://did:plc:abc/space.remanso.note/multi/segment")
    ).toEqual({
      did: "did:plc:abc",
      collection: "space.remanso.note",
      rkey: "multi/segment"
    })
  })

  it("returns the collection segment", () => {
    expect(parseAtUri("at://did:plc:abc/space.remanso.recording/3xyz")).toEqual({
      did: "did:plc:abc",
      collection: "space.remanso.recording",
      rkey: "3xyz"
    })
  })

  it("throws when the URI does not start with at://", () => {
    expect(() => parseAtUri("https://did:plc:abc/collection/rkey")).toThrow(
      /Invalid AT URI/
    )
  })

  it("throws when the DID prefix is missing", () => {
    expect(() => parseAtUri("at://abc/collection/rkey")).toThrow(
      /Invalid AT URI/
    )
  })

  it("throws when the collection or rkey is missing", () => {
    expect(() => parseAtUri("at://did:plc:abc/onlycollection")).toThrow(
      /Invalid AT URI/
    )
  })

  it("throws on empty input", () => {
    expect(() => parseAtUri("")).toThrow(/Invalid AT URI/)
  })
})

import { describe, expect, it } from "vitest"

import { publishedNoteRef } from "./publishedNoteRef"

const withAtUri = (atUri: string) =>
  `---\ntitle: Ep 1\natUri: ${atUri}\n---\n\nBody\n`

describe("publishedNoteRef", () => {
  it("takes the repo and the rkey from the atUri the CLI wrote back", () => {
    expect(
      publishedNoteRef(
        withAtUri("at://did:plc:abc/site.standard.document/3labc")
      )
    ).toEqual({ did: "did:plc:abc", rkey: "3labc" })
  })

  it("reads the same pair whichever collection the at-uri names", () => {
    // The note is created in the same repo at the document's rkey, so either
    // uri answers the same question.
    expect(
      publishedNoteRef(withAtUri("at://did:plc:abc/space.remanso.note/3labc"))
    ).toEqual({ did: "did:plc:abc", rkey: "3labc" })
  })

  it("keeps a did:web repo intact", () => {
    expect(
      publishedNoteRef(
        withAtUri("at://did:web:example.com/site.standard.document/3labc")
      )
    ).toEqual({ did: "did:web:example.com", rkey: "3labc" })
  })

  it("strips quotes around the value", () => {
    expect(
      publishedNoteRef(
        withAtUri('"at://did:plc:abc/site.standard.document/3labc"')
      )
    ).toEqual({ did: "did:plc:abc", rkey: "3labc" })
  })

  it("is null for a note that has never been published", () => {
    expect(publishedNoteRef("---\ntitle: Draft\n---\n\nBody\n")).toBe(null)
    expect(publishedNoteRef("# Just a heading\n")).toBe(null)
  })

  it("is null when atUri is not an at-uri", () => {
    expect(publishedNoteRef(withAtUri("https://example.com/x"))).toBe(null)
    expect(publishedNoteRef(withAtUri("at://did:plc:abc"))).toBe(null)
  })

  it("ignores an atUri that is only in the body", () => {
    expect(
      publishedNoteRef(
        "Body first\n\natUri: at://did:plc:abc/site.standard.document/3labc\n"
      )
    ).toBe(null)
  })
})

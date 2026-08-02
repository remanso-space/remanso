import { describe, expect, it } from "vitest"

import { noteRkeyFromFrontmatter } from "./noteRkeyFromFrontmatter"

const withAtUri = (atUri: string) =>
  `---\ntitle: Ep 1\natUri: ${atUri}\n---\n\nBody\n`

describe("noteRkeyFromFrontmatter", () => {
  it("takes the rkey from the atUri the CLI wrote back", () => {
    expect(
      noteRkeyFromFrontmatter(
        withAtUri("at://did:plc:abc/site.standard.document/3labc")
      )
    ).toBe("3labc")
  })

  it("reads the same rkey whichever collection the at-uri names", () => {
    // The note is created at the document's rkey, so either uri answers the
    // same question.
    expect(
      noteRkeyFromFrontmatter(
        withAtUri("at://did:plc:abc/space.remanso.note/3labc")
      )
    ).toBe("3labc")
  })

  it("strips quotes around the value", () => {
    expect(
      noteRkeyFromFrontmatter(
        withAtUri('"at://did:plc:abc/site.standard.document/3labc"')
      )
    ).toBe("3labc")
  })

  it("is null for a note that has never been published", () => {
    expect(noteRkeyFromFrontmatter("---\ntitle: Draft\n---\n\nBody\n")).toBe(
      null
    )
    expect(noteRkeyFromFrontmatter("# Just a heading\n")).toBe(null)
  })

  it("is null when atUri is not an at-uri", () => {
    expect(noteRkeyFromFrontmatter(withAtUri("https://example.com/x"))).toBe(
      null
    )
    expect(noteRkeyFromFrontmatter(withAtUri("at://did:plc:abc"))).toBe(null)
  })

  it("ignores an atUri that is only in the body", () => {
    expect(
      noteRkeyFromFrontmatter(
        "Body first\n\natUri: at://did:plc:abc/site.standard.document/3labc\n"
      )
    ).toBe(null)
  })
})

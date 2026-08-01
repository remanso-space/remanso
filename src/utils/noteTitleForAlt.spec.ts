import { describe, expect, it } from "vitest"

import { noteTitleForAlt } from "@/utils/noteTitleForAlt"

describe("noteTitleForAlt", () => {
  it("prefers the frontmatter title", () => {
    const content = `---
title: Ma 間
publishDate: 2026-02-02
---

# Something Else
`
    expect(noteTitleForAlt(content, "japonais/ma.pub.md")).toBe("Ma 間 - audio")
  })

  it("strips quotes from a quoted frontmatter title", () => {
    const content = `---
title: 'Ma 間'
---
`
    expect(noteTitleForAlt(content, "japonais/ma.pub.md")).toBe("Ma 間 - audio")
  })

  it("falls back to the leading H1 when there is no frontmatter title", () => {
    const content = `---
publishDate: 2026-02-02
---

# Ma 間

Body.
`
    expect(noteTitleForAlt(content, "japonais/ma.pub.md")).toBe("Ma 間 - audio")
  })

  it("uses the H1 when there is no frontmatter at all", () => {
    expect(noteTitleForAlt("# Ma 間\n\nBody.\n", "japonais/ma.pub.md")).toBe(
      "Ma 間 - audio"
    )
  })

  it("falls back to the filename, stripping the .pub.md double extension", () => {
    expect(noteTitleForAlt("Body with no title.\n", "japonais/ma.pub.md")).toBe(
      "ma - audio"
    )
  })

  it("turns hyphens into spaces in the filename fallback", () => {
    expect(
      noteTitleForAlt("Body.\n", "mieux-echouer/quantity-brings-quality.pub.md")
    ).toBe("quantity brings quality - audio")
  })

  it("handles a plain .md path", () => {
    expect(noteTitleForAlt("Body.\n", "notes/my-note.md")).toBe(
      "my note - audio"
    )
  })

  it("returns just the suffix when nothing can be derived", () => {
    expect(noteTitleForAlt("", "")).toBe("- audio")
  })
})

import { describe, expect, it } from "vitest"

import { stripLeadingTitle } from "@/utils/stripLeadingTitle"

describe("stripLeadingTitle", () => {
  it("strips a leading H1 that matches the title", () => {
    const content = "# The commit that took 611 seconds\n\nBody text."
    expect(stripLeadingTitle(content, "The commit that took 611 seconds")).toBe(
      "\nBody text."
    )
  })

  it("matches ignoring case and punctuation", () => {
    const content = "#   Hello, World!  \n\nBody."
    expect(stripLeadingTitle(content, "hello world")).toBe("\nBody.")
  })

  it("keeps a leading H1 that does not match the title", () => {
    const content = "# Some other heading\n\nBody."
    expect(stripLeadingTitle(content, "The real title")).toBe(content)
  })

  it("leaves content without a leading H1 untouched", () => {
    const content = "Just body text, no heading."
    expect(stripLeadingTitle(content, "Any title")).toBe(content)
  })

  it("does not strip an H2 even when the text matches", () => {
    const content = "## The title\n\nBody."
    expect(stripLeadingTitle(content, "The title")).toBe(content)
  })

  it("returns content unchanged when no title is given", () => {
    const content = "# The title\n\nBody."
    expect(stripLeadingTitle(content, undefined)).toBe(content)
  })

  it("skips a leading YAML frontmatter block", () => {
    const content = "---\ntheme: black\n---\n# The title\n\nBody."
    expect(stripLeadingTitle(content, "The title")).toBe(
      "---\ntheme: black\n---\n\nBody."
    )
  })
})

import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { markdownItTablerIcons } from "./markdown-it-tabler-icons"

describe("markdownItTablerIcons", () => {
  const renderer = () => MarkdownIt().use(markdownItTablerIcons)

  it("renders a tabler icon for :icon-name: syntax", () => {
    expect(renderer().render(":home:")).toContain('<i class="ti ti-home"></i>')
  })

  it("supports hyphenated icon names", () => {
    expect(renderer().render(":arrow-right:")).toContain(
      '<i class="ti ti-arrow-right"></i>'
    )
  })

  it("renders icons inline alongside surrounding text", () => {
    const html = renderer().render("Click :check: to confirm")
    expect(html).toContain("Click")
    expect(html).toContain('<i class="ti ti-check"></i>')
    expect(html).toContain("to confirm")
  })

  it("does not fire on text without colon delimiters", () => {
    expect(renderer().render("home")).toBe("<p>home</p>\n")
  })
})

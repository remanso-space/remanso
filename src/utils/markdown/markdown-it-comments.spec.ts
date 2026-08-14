import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { markdownItComments } from "./markdown-it-comments"

describe("markdownItComments", () => {
  const renderer = () => MarkdownIt().use(markdownItComments)

  it("drops a comment that owns its own block", () => {
    expect(renderer().render("<!-- hidden -->\n\nvisible")).toBe(
      "<p>visible</p>\n"
    )
  })

  it("drops a multi-line comment block", () => {
    const html = renderer().render("<!--\nhidden\nlines\n-->\n\nvisible")
    expect(html).toBe("<p>visible</p>\n")
  })

  it("drops an unterminated comment and everything after it", () => {
    expect(renderer().render("visible\n\n<!-- hidden\nstill hidden")).toBe(
      "<p>visible</p>\n"
    )
  })

  it("drops a comment inside a paragraph", () => {
    expect(renderer().render("before <!-- hidden --> after")).toBe(
      "<p>before  after</p>\n"
    )
  })

  it("drops a comment followed by text on the same line", () => {
    expect(renderer().render("<!-- hidden --> visible")).toBe(
      "<p> visible</p>\n"
    )
  })

  it("drops a comment inside a list item", () => {
    expect(renderer().render("- one\n- <!-- hidden -->two")).toContain(
      "<li>two</li>"
    )
  })

  it("drops a comment inside a blockquote", () => {
    expect(renderer().render("> quoted <!-- hidden -->")).toContain(
      "<p>quoted </p>"
    )
  })

  it("keeps comments inside a fenced code block", () => {
    const html = renderer().render("```\n<!-- kept -->\n```")
    expect(html).toContain("&lt;!-- kept --&gt;")
  })

  it("keeps comments inside an indented code block", () => {
    const html = renderer().render("    <!-- kept -->")
    expect(html).toContain("&lt;!-- kept --&gt;")
  })

  it("keeps comments inside inline code", () => {
    const html = renderer().render("use `<!-- kept -->` here")
    expect(html).toContain("<code>&lt;!-- kept --&gt;</code>")
  })

  it("leaves other markup alone", () => {
    expect(renderer().render("# title")).toBe("<h1>title</h1>\n")
  })
})

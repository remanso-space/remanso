import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { markdownItPlugin } from "./markdown-it-regexp"

describe("markdownItPlugin", () => {
  it("calls the replacer when the pattern matches at start of inline content", () => {
    const plugin = markdownItPlugin(/@(\w+)/, (match) => {
      return `<span class="mention">${match[1]}</span>`
    })

    const md = MarkdownIt().use(plugin)

    expect(md.render("@alice posted a note")).toContain(
      '<span class="mention">alice</span>'
    )
  })

  it("leaves non-matching text untouched", () => {
    const plugin = markdownItPlugin(/@(\w+)/, (match) => `MATCH:${match[1]}`)
    const md = MarkdownIt().use(plugin)

    expect(md.render("no mention here")).toBe("<p>no mention here</p>\n")
  })

  it("supports case-insensitive matching when the input regex has the i flag", () => {
    const plugin = markdownItPlugin(/@hello/i, () => "<b>hi</b>")
    const md = MarkdownIt().use(plugin)

    expect(md.render("@HELLO world")).toContain("<b>hi</b>")
  })

  it("each plugin instance gets a unique rule id (no collisions)", () => {
    const pluginA = markdownItPlugin(/@a/, () => "RULE_A")
    const pluginB = markdownItPlugin(/@b/, () => "RULE_B")
    const md = MarkdownIt().use(pluginA).use(pluginB)

    const result = md.render("@a and @b")
    expect(result).toContain("RULE_A")
    expect(result).toContain("RULE_B")
  })
})

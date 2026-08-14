import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { markdownItHtml } from "./markdown-it-html"

describe("markdownItHtml", () => {
  const renderer = () => MarkdownIt().use(markdownItHtml)

  describe("allowlisted img", () => {
    it("renders a raw img tag", () => {
      expect(renderer().render('<img src="./docs/starkit.png">')).toBe(
        '<p><img src="./docs/starkit.png"></p>\n'
      )
    })

    it("keeps the allowlisted attributes", () => {
      expect(
        renderer().render(
          '<img src="a.png" alt="Starkit" title="logo" width="128" height="128">'
        )
      ).toContain(
        '<img src="a.png" alt="Starkit" title="logo" width="128" height="128">'
      )
    })

    it("accepts a self-closing tag", () => {
      expect(renderer().render('<img src="a.png" />')).toContain(
        '<img src="a.png">'
      )
    })

    it("keeps an attribute value holding a bracket", () => {
      expect(renderer().render('<img src="a.png" alt="a > b">')).toContain(
        '<img src="a.png" alt="a &gt; b">'
      )
    })

    it("drops attributes outside the allowlist", () => {
      expect(
        renderer().render(
          '<img src="a.png" onerror="alert(1)" class="x" style="color:red">'
        )
      ).toBe('<p><img src="a.png"></p>\n')
    })

    it("drops non-numeric dimensions", () => {
      expect(
        renderer().render('<img src="a.png" width="100%25 onload=x">')
      ).toBe('<p><img src="a.png"></p>\n')
    })

    it("escapes quotes in attribute values", () => {
      expect(
        renderer().render("<img src='a.png\" onerror=alert(1)'>")
      ).toContain('<img src="a.png&quot; onerror=alert(1)">')
    })

    it("allows a data:image source", () => {
      expect(renderer().render('<img src="data:image/png;base64,AAA">')).toBe(
        '<p><img src="data:image/png;base64,AAA"></p>\n'
      )
    })

    it("prunes an img with a javascript: source", () => {
      expect(renderer().render('text <img src="javascript:alert(1)">')).toBe(
        "<p>text </p>\n"
      )
    })

    it("prunes an img with a non-image data source", () => {
      const html = renderer().render('<img src="data:text/html,x">')
      expect(html).not.toContain("<img")
      expect(html).not.toContain("data:text/html")
    })

    it("prunes a src-less img", () => {
      expect(renderer().render('text <img alt="none">')).toBe("<p>text </p>\n")
    })

    it("renders an img inline among text", () => {
      expect(renderer().render('before <img src="a.png"> after')).toBe(
        '<p>before <img src="a.png"> after</p>\n'
      )
    })
  })

  describe("pruned tags", () => {
    it("prunes a tag outside the allowlist but keeps its text", () => {
      expect(renderer().render('<span class="x">kept</span>')).toBe(
        "<p>kept</p>\n"
      )
    })

    it("prunes a script tag, leaving its body as inert text", () => {
      const html = renderer().render("<script>alert(1)</script>")
      expect(html).toBe("<p>alert(1)</p>\n")
    })

    it("prunes a centering wrapper around an img", () => {
      expect(
        renderer().render(
          '<p align="center">\n  <img src="./logo.png" width="128">\n</p>'
        )
      ).toBe('<p>\n<img src="./logo.png" width="128">\n</p>\n')
    })

    it("prunes an html comment", () => {
      expect(renderer().render("text <!-- hidden --> more")).toBe(
        "<p>text  more</p>\n"
      )
    })

    it("prunes a declaration and a cdata block", () => {
      expect(renderer().render("<!DOCTYPE html>x")).toBe("<p>x</p>\n")
      expect(renderer().render("<![CDATA[y]]>x")).toBe("<p>x</p>\n")
    })
  })

  describe("what must stay text", () => {
    it("leaves a bare less-than alone", () => {
      expect(renderer().render("a < b and <3")).toBe(
        "<p>a &lt; b and &lt;3</p>\n"
      )
    })

    it("still autolinks a bracketed url", () => {
      expect(renderer().render("<https://example.com>")).toContain(
        '<a href="https://example.com">'
      )
    })

    it("keeps html inside inline code and fences", () => {
      expect(renderer().render('`<img src="a.png">`')).toContain(
        "<code>&lt;img src=&quot;a.png&quot;&gt;</code>"
      )
      expect(renderer().render('```\n<p align="center">\n```')).toContain(
        "&lt;p align=&quot;center&quot;&gt;"
      )
    })

    it("leaves markdown images untouched", () => {
      expect(renderer().render("![alt](a.png)")).toBe(
        '<p><img src="a.png" alt="alt"></p>\n'
      )
    })
  })
})

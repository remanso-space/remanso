import { describe, expect, it, vi } from "vitest"

vi.mock("@/data/data", () => ({
  data: {},
  generateId: (type: string, id: string) => `${type}-${id}`
}))

import {
  markdownBuilder,
  renderCodeFile,
  renderTikzFile,
  useShiki
} from "@/hooks/useMarkdown.hook"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"

// Plain-text fallback paints at most one colour; a grammar
// splits the code into differently coloured tokens.
const tokenColours = (html: string) =>
  new Set(html.match(/<span style="color:#[0-9A-Fa-f]+/g))

describe("renderCodeFile", () => {
  it("wraps highlighted files in a code-file container with a sized gutter", async () => {
    const html = await renderCodeFile({
      rawContent: "const a = 1\nconst b = 2\n",
      lang: "typescript",
      filename: "example.ts"
    })

    expect(html).toContain('<div class="code-file"')
    expect(html).toContain("--line-number-width:1ch")
    expect(html.match(/class="line"/g)).toHaveLength(2)
  })

  // app.css paints the dark themes from these custom properties, because the
  // highlighter inlines the light colours and leaves the dark ones in vars.
  it("carries the dual-theme custom properties the dark styling reads", async () => {
    const html = await renderCodeFile({
      rawContent: "const a = 1\n",
      lang: "typescript"
    })

    expect(html).toContain(
      'class="shiki shiki-themes vitesse-light vitesse-black"'
    )
    expect(html).toContain("--shiki-dark-bg:")
    expect(html).toContain("--shiki-dark:")
  })

  it("wraps each line of unknown-language files in line spans", async () => {
    const html = await renderCodeFile({
      rawContent: "line one\nline <two>\n",
      lang: null
    })

    expect(html).toContain('<span class="line">line one</span>')
    expect(html).toContain('<span class="line">line &lt;two&gt;</span>')
    expect(html.match(/class="line"/g)).toHaveLength(2)
  })

  it("sizes the gutter for files with many lines", async () => {
    const html = await renderCodeFile({
      rawContent: Array.from({ length: 120 }, (_, i) => `line ${i}`).join("\n"),
      lang: null
    })

    expect(html).toContain("--line-number-width:3ch")
  })

  it("fetches a grammar that isn't preloaded before rendering the file", async () => {
    const html = await renderCodeFile({
      rawContent: "name: remanso\nversion: 2\n",
      lang: "yaml"
    })

    expect(tokenColours(html).size).toBeGreaterThan(1)
  })

  // A fence must still render as code instead of failing the whole note into
  // its raw-text fallback when shiki has no grammar for it.
  it("renders a language shiki has no grammar for as plain code", async () => {
    const html = await renderCodeFile({
      rawContent: "name: remanso\n",
      lang: "notalanguage"
    })

    expect(html).toContain('class="shiki')
    expect(html).toContain("name: remanso")
  })
})

describe("markdownBuilder fence languages", () => {
  const { toHTML } = markdownBuilder()

  it("re-renders a fence highlighted once its grammar has loaded", async () => {
    await useShiki()
    const note = "```python\ndef greet(name):\n    return name\n```"

    expect(tokenColours(toHTML(note)).size).toBeLessThan(2)
    await vi.waitFor(() =>
      expect(tokenColours(toHTML(note)).size).toBeGreaterThan(1)
    )
  })
})

describe("renderTikzFile", () => {
  const source = "\\begin{document}\n\\draw (0,0) -- (1,1);\n\\end{document}"

  it("renders a standalone .tikz file as a TikZ placeholder", () => {
    const html = renderTikzFile(source)

    expect(html).toContain('class="tikz"')
    expect(html).toContain("tikz-loading")

    const encoded = html.match(/data-tikz-source="([^"]+)"/)?.[1] ?? ""
    expect(decodeBase64ToUTF8(encoded)).toBe(source)
  })

  it("carries the same source as a fenced tikz block", () => {
    const { toHTML } = markdownBuilder()
    const fenced = toHTML(`\`\`\`tikz\n${source}\n\`\`\``)

    const fromFence = fenced.match(/data-tikz-source="([^"]+)"/)?.[1] ?? ""
    const fromFile =
      renderTikzFile(`${source}\n`).match(/data-tikz-source="([^"]+)"/)?.[1] ??
      ""

    expect(decodeBase64ToUTF8(fromFile)).toBe(decodeBase64ToUTF8(fromFence))
  })
})

// The plugin's own spec builds an isolated MarkdownIt, so it cannot catch a
// registration-order regression. These go through the shared `md` instance
// that both note views actually render with.
describe("markdownBuilder recording links", () => {
  const { toHTML } = markdownBuilder()

  it("renders a recording at-uri as a player placeholder", () => {
    const html = toHTML(
      "![Ma 間 - audio](at://did:plc:abc/space.remanso.recording/3xyz)"
    )

    expect(html).toContain('class="recording-block"')
    expect(html).toContain(
      'data-at-uri="at://did:plc:abc/space.remanso.recording/3xyz"'
    )
    expect(html).toContain('data-alt="Ma 間 - audio"')
    expect(html).not.toContain("<img")
  })

  it("still renders ordinary images and audio files", () => {
    expect(toHTML("![cat](cat.png)")).toContain("<img")
    expect(toHTML("![](song.mp3)")).toContain("<audio")
  })
})

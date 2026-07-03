import { describe, expect, it, vi } from "vitest"

vi.mock("@/data/data", () => ({
  data: {},
  generateId: (type: string, id: string) => `${type}-${id}`
}))

import { renderCodeFile } from "@/hooks/useMarkdown.hook"

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
})

import { describe, expect, it } from "vitest"

import { markdownBuilder, runMermaid } from "./useMarkdown.hook"

/**
 * mermaid measures rendered text to lay a graph out, so it only ever produces
 * an svg in a browser with real layout — the jsdom specs mock it away.
 */
describe("mermaid rendering in a real browser", () => {
  it("turns a mermaid block into an svg diagram", async () => {
    const { toHTML } = markdownBuilder()
    const host = document.createElement("div")
    host.className = "mermaid-host"
    host.innerHTML = toHTML("```mermaid\ngraph TD;\n  A-->B;\n```\n")
    document.body.append(host)

    expect(host.querySelector(".mermaid")).not.toBeNull()

    await runMermaid(".mermaid-host .mermaid")

    const svg = host.querySelector(".mermaid svg")
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll(".nodes .node").length).toBe(2)

    host.remove()
  })
})

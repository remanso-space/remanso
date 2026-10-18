import { describe, expect, it } from "vitest"

import { markdownBuilder, runMermaid } from "./useMarkdown.hook"

/**
 * pele measures rendered text to lay a graph out, so it only ever produces an
 * svg in a browser with real layout — the jsdom specs mock it away.
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
    expect(svg!.querySelectorAll(".pele-nodes .pele-node").length).toBe(2)

    host.remove()
  })

  it("paints the diagram from the DaisyUI theme", async () => {
    const { toHTML } = markdownBuilder()
    const host = document.createElement("div")
    host.className = "mermaid-host"
    host.innerHTML = toHTML("```mermaid\ngraph TD;\n  A-->B;\n```\n")
    document.body.append(host)

    await runMermaid(".mermaid-host .mermaid")

    // pele reads every color from the `--pele-*` properties app.css maps onto
    // the DaisyUI palette, so a node has to come out the theme's surface color
    // rather than the renderer's own default.
    const shape = host.querySelector(".mermaid .pele-node rect")!

    // Resolved through an element rather than read off the custom property:
    // the computed `fill` is serialized, the raw property value is not.
    const probe = document.createElement("div")
    probe.style.color = "var(--color-base-200)"
    host.append(probe)
    const themeSurface = getComputedStyle(probe).color

    expect(getComputedStyle(shape).fill).toBe(themeSurface)

    host.remove()
  })
})

import MarkdownIt from "markdown-it"
import { describe, expect, it, vi } from "vitest"

import { runInstruments } from "@/modules/instruments/runInstruments"
import { markdownItInstruments } from "@/utils/markdown/markdown-it-instruments"

// Flashcards shuffles its deck; keep the source order so "the first card" is
// a fact about the sibling and not about the draw.
vi.mock("@/modules/instruments/shuffle", () => ({
  shuffle: <T>(items: T[]): T[] => [...items]
}))

const md = new MarkdownIt().use(markdownItInstruments)

/**
 * Render a note the way the app does and mount its instruments. The renderer
 * wraps tables in `div.overflow-x-auto` (useMarkdown.hook.ts), so reproduce
 * that here — the wrapper is what an instrument is handed as its sibling.
 */
const renderNote = async (source: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div id="note">${md.render(source)}</div>`
  const note = document.getElementById("note") as HTMLElement
  for (const table of Array.from(note.querySelectorAll(":scope > table"))) {
    const wrapper = document.createElement("div")
    wrapper.className = "overflow-x-auto"
    table.replaceWith(wrapper)
    wrapper.append(table)
  }
  await runInstruments("#note .instrument-block")
  return note
}

describe("runInstruments", () => {
  it("feeds an instrument the markdown table below it and hides it", async () => {
    const note = await renderNote(`:::flashcards:::

| Question | Réponse |
| -------- | ------- |
| Comment dire « bleu » ? | 파란색 |
| Second question | Second answer |
`)
    expect(note.querySelector(".instrument")?.textContent).toContain(
      "Comment dire « bleu » ?"
    )
    expect(
      (note.querySelector(".overflow-x-auto") as HTMLElement).style.display
    ).toBe("none")
  })

  it("feeds it a pipe-separated list just as well", async () => {
    const note = await renderNote(`:::flashcards:::

- Comment dire « bleu » ? | 파란색
- Second question | Second answer
`)
    expect(note.querySelector(".instrument")?.textContent).toContain(
      "Comment dire « bleu » ?"
    )
    expect((note.querySelector("ul") as HTMLElement).style.display).toBe("none")
  })

  it("leaves the note's own bullets alone", async () => {
    const note = await renderNote(`:::flashcards:::

- a plain remark
- another one
`)
    expect(note.querySelector(".instrument")?.textContent).toContain(
      "Add a markdown table right below"
    )
    expect((note.querySelector("ul") as HTMLElement).style.display).toBe("")
  })

  it("mounts an instrument that has no sibling at all", async () => {
    const note = await renderNote(":::timer 2m:::")
    expect(note.querySelector(".instrument")?.textContent).toContain("02:00")
  })

  it("mounts each placeholder once", async () => {
    const note = await renderNote(":::timer 2m:::")
    await runInstruments("#note .instrument-block")
    expect(note.querySelectorAll(".instrument")).toHaveLength(1)
  })
})

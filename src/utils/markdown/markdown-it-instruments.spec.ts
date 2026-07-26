import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { markdownItInstruments } from "@/utils/markdown/markdown-it-instruments"

const md = new MarkdownIt().use(markdownItInstruments)

describe("markdownItInstruments", () => {
  it("renders a bare instrument", () => {
    expect(md.render(":::stopwatch:::")).toBe(
      '<div class="instrument-block" data-instrument="stopwatch" data-args=""></div>\n'
    )
  })

  it("renders an instrument with args", () => {
    expect(md.render(":::timer 2m:::")).toBe(
      '<div class="instrument-block" data-instrument="timer" data-args="2m"></div>\n'
    )
  })

  it("escapes args", () => {
    expect(md.render(':::timer "><img src=x>:::')).toContain(
      'data-args="&quot;&gt;&lt;img src=x&gt;"'
    )
  })

  it("ignores unknown names", () => {
    expect(md.render(":::pomodoro:::")).not.toContain("instrument-block")
  })

  it("leaves multi-line ::: containers (tabs) alone", () => {
    const rendered = md.render("::: tabs\ncontent\n:::")
    expect(rendered).not.toContain("instrument-block")
  })

  it("only matches when ::: closes on the same line", () => {
    expect(md.render(":::timer\n:::")).not.toContain("instrument-block")
  })

  it("renders instruments between other blocks", () => {
    const rendered = md.render("before\n\n:::timer 5m:::\n\nafter")
    expect(rendered).toContain("<p>before</p>")
    expect(rendered).toContain('data-instrument="timer"')
    expect(rendered).toContain("<p>after</p>")
  })
})

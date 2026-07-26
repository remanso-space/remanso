import type MarkdownIt from "markdown-it"

import { instrumentNames } from "@/modules/instruments/registry"

const INSTRUMENT_LINE = /^:::([a-z][\w-]*)(?:\s+(.*?))?:::\s*$/

/**
 * One-line instrument syntax: `:::timer:::`, `:::timer 2m:::`,
 * `:::stopwatch:::`. Only registered instrument names match — anything else
 * (like multi-line `::: tabs` containers) falls through to other rules.
 * Emits a placeholder div that runInstruments mounts a Vue component onto.
 */
export const markdownItInstruments = (md: MarkdownIt): void => {
  md.block.ruler.before(
    "fence",
    "instrument",
    (state, startLine, _endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine]
      const max = state.eMarks[startLine]
      const match = INSTRUMENT_LINE.exec(state.src.slice(start, max))
      if (
        !match ||
        !(instrumentNames as readonly string[]).includes(match[1])
      ) {
        return false
      }
      if (silent) return true

      const token = state.push("instrument", "div", 0)
      token.markup = ":::"
      token.info = match[1]
      token.meta = { args: (match[2] ?? "").trim() }
      token.map = [startLine, startLine + 1]
      state.line = startLine + 1
      return true
    }
  )

  md.renderer.rules.instrument = (tokens, index) => {
    const token = tokens[index]
    const args = md.utils.escapeHtml((token.meta as { args: string }).args)
    return `<div class="instrument-block" data-instrument="${token.info}" data-args="${args}"></div>\n`
  }
}

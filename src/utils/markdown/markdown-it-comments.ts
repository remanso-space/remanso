import type MarkdownIt from "markdown-it"
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs"
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs"

const OPEN = "<!--"
const CLOSE = "-->"

// `html: false` escapes HTML comments instead of dropping them, so notes leak
// `<!-- todo -->` into the rendered prose. Consume them at tokenizer level so
// code fences and inline code keep showing their comments verbatim.
const commentBlock = (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean => {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false

  const start = state.bMarks[startLine] + state.tShift[startLine]
  if (!state.src.startsWith(OPEN, start)) return false

  const closeIndex = state.src.indexOf(CLOSE, start + OPEN.length)
  const end = closeIndex === -1 ? state.src.length : closeIndex + CLOSE.length

  let line = startLine
  while (line < endLine - 1 && state.eMarks[line] < end) line++

  // Text after the closing marker is real content: let the paragraph rule take
  // the block and the inline rule strip the comment.
  if (state.src.slice(end, state.eMarks[line]).trim()) return false

  if (silent) return true
  state.line = line + 1
  return true
}

const commentInline = (state: StateInline): boolean => {
  if (!state.src.startsWith(OPEN, state.pos)) return false

  const closeIndex = state.src.indexOf(CLOSE, state.pos + OPEN.length)
  if (closeIndex === -1) return false

  const end = closeIndex + CLOSE.length
  if (end > state.posMax) return false

  state.pos = end
  return true
}

export const markdownItComments = (md: MarkdownIt) => {
  md.block.ruler.before("html_block", "comment_block", commentBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"]
  })
  md.inline.ruler.before("html_inline", "comment_inline", commentInline)
}

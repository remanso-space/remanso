/**
 * Splice a block-level markdown snippet into `content` at a character offset.
 *
 * Markdown needs a blank line on either side of a block, so the surrounding
 * whitespace is normalised rather than blindly concatenated — otherwise
 * inserting onto an already-blank line stacks up empty lines, and inserting
 * mid-paragraph glues the block onto the preceding sentence.
 *
 * A null or out-of-range offset appends to the end, which is what happens when
 * the editor never had focus (the file picker steals it on mobile).
 */
export const insertBlockAt = (
  content: string,
  offset: number | null,
  block: string
): string => {
  const append = offset === null || offset > content.length

  if (append) {
    const trimmed = content.replace(/\s+$/, "")
    return trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`
  }

  const at = Math.max(0, offset)
  const before = content.slice(0, at).replace(/\s+$/, "")
  const after = content.slice(at).replace(/^[ \t]*\r?\n\s*/, "")

  const head = before ? `${before}\n\n` : ""
  const tail = after ? `\n\n${after}` : "\n"

  return `${head}${block}${tail}`
}

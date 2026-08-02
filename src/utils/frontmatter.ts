export const FRONTMATTER = /^\s*---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/

export const unquote = (value: string) =>
  value.replace(/^['"]|['"]$/g, "").trim()

/**
 * One scalar out of a `.pub.md`'s YAML frontmatter, unquoted.
 *
 * A regex rather than a YAML parser on purpose: the app only ever reads a
 * couple of leaf strings out of the block, and pulling a parser into the note
 * view chunk would cost every reader for something two callers need.
 */
export const frontmatterField = (
  content: string,
  key: string
): string | undefined => {
  const block = content.match(FRONTMATTER)?.[1]
  if (!block) return undefined

  const found = block.match(
    new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, "m")
  )?.[1]
  return found ? unquote(found) : undefined
}

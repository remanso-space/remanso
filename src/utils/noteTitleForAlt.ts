import { FRONTMATTER, frontmatterField } from "@/utils/frontmatter"

const LEADING_H1 = /^[ \t]*#[ \t]+(.+?)[ \t]*$/m

const fromFilename = (path: string): string => {
  const filename = path.split("/").pop() ?? ""
  // .pub.md is two extensions, so strip the known suffixes rather than
  // popping one dot-segment — pathToNoteTitle turns ma.pub.md into "ma.pub".
  return filename
    .replace(/\.(pub\.)?(md|markdown|mdx)$/i, "")
    .replaceAll("-", " ")
    .trim()
}

/**
 * The alt text for a recording line: the note's title followed by " - audio".
 *
 * Outside Remanso this is all a reader sees — GitHub and IDE previews render
 * the line as a broken image and show the alt text — so it has to name the
 * note, not the file. Frontmatter first (every .pub.md has a title, the CLI
 * requires it), then the leading H1, then the filename.
 */
export const noteTitleForAlt = (content: string, path: string): string => {
  const frontmatterTitle = frontmatterField(content, "title")
  if (frontmatterTitle) return `${frontmatterTitle} - audio`

  const frontmatter = content.match(FRONTMATTER)
  const body = frontmatter ? content.slice(frontmatter[0].length) : content
  const heading = body.match(LEADING_H1)?.[1]
  if (heading) return `${heading.trim()} - audio`

  return `${fromFilename(path)} - audio`.trim()
}

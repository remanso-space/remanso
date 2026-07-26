import { slugify } from "@/utils/slugify"

/**
 * Public notes keep the title as a separate record field but the body usually
 * repeats it as the opening H1. When the title is rendered in the header, drop
 * that leading H1 so it isn't shown twice. Only strips when the heading text
 * matches the title, so a body opening with a different heading is untouched.
 * Skips an optional leading YAML frontmatter block.
 */
export function stripLeadingTitle(content: string, title?: string): string {
  if (!title) return content
  const target = slugify(title)
  if (!target) return content

  const frontmatter = content.match(/^\s*---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/)
  const start = frontmatter ? frontmatter[0].length : 0

  const heading = content
    .slice(start)
    .match(/^[ \t]*\r?\n*[ \t]*#[ \t]+(.+?)[ \t]*(?:\r?\n|$)/)
  if (!heading || slugify(heading[1]) !== target) return content

  return content.slice(0, start) + content.slice(start + heading[0].length)
}

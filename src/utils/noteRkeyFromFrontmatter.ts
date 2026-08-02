import { frontmatterField } from "@/utils/frontmatter"

const AT_URI = /^at:\/\/[^/\s]+\/[^/\s]+\/([^/\s]+)$/

/**
 * The rkey of the published `space.remanso.note` for a local `.pub.md`, or
 * null while the file has never been published.
 *
 * The CLI writes `atUri` back into the frontmatter after publishing, and that
 * at-uri names the `site.standard.document` record rather than the note — but
 * the note is deliberately created at the *same* rkey, so the last path
 * segment is the note's rkey whichever collection the uri names. That is what
 * lets the editor attach a recording to the note it is editing: the recording
 * goes to this rkey, and the reader finds it there with nothing written into
 * the note at all.
 */
export const noteRkeyFromFrontmatter = (content: string): string | null => {
  const atUri = frontmatterField(content, "atUri")
  if (!atUri) return null

  return atUri.match(AT_URI)?.[1] ?? null
}

import { frontmatterField } from "@/utils/frontmatter"

const AT_URI = /^at:\/\/([^/\s]+)\/[^/\s]+\/([^/\s]+)$/

export interface PublishedNoteRef {
  did: string
  rkey: string
}

/**
 * Where a local `.pub.md` lives on the network, or null while the file has
 * never been published.
 *
 * The CLI writes `atUri` back into the frontmatter after publishing. That
 * at-uri names the `site.standard.document` record rather than the note, but
 * both the repo and the rkey are the note's: the note is deliberately created
 * at the same rkey in the same repo, so only the collection segment differs.
 *
 * Both halves come from the file, never from the session. Reading a recording
 * needs no auth, and a note in someone else's repo has to resolve against
 * *their* DID — the signed-in one would point at the wrong repo.
 */
export const publishedNoteRef = (content: string): PublishedNoteRef | null => {
  const atUri = frontmatterField(content, "atUri")
  if (!atUri) return null

  const match = atUri.match(AT_URI)
  if (!match) return null

  return { did: match[1], rkey: match[2] }
}

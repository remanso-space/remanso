// A shared link pins each stacked note to a blob sha, so the recipient sees the
// exact snapshot forever. A "living" link trades that pin for freshness: notes
// are referenced by their file path instead, and re-resolved to the latest blob
// sha against the repo's HEAD file list every time the link is opened.
//
// The whole stack rides in a single `?notes=` value: paths comma-separated, with
// the `.md` left implied since every note is markdown — so `docs/bom.md` and
// `docs/wiring.md` become `?notes=docs/bom,docs/wiring`. A slash is legal query
// data (RFC 3986 §3.4) and a comma is a sub-delim, so vue-router leaves both
// unescaped and the path stays recognisable as a path.

export const LIVE_NOTES_PARAM = "notes"

/** The name the param first shipped under; still read so older links resolve. */
export const LEGACY_LIVE_NOTES_PARAM = "liveNotes"

const SHA_PATTERN = /^[0-9a-f]{40}$/i

const SEPARATOR = ","

/**
 * `docs/bom.md` → `docs/bom`. Returns null for a path holding the separator:
 * it can't be expressed in the list, so the caller pins it to its sha instead.
 */
const pathToLiveEntry = (path: string): string | null =>
  path.includes(SEPARATOR) ? null : path.replace(/\.md$/, "")

/**
 * The paths an entry could mean, most specific first. Trying it as-is before
 * appending `.md` keeps links shared with the extension working, and covers the
 * odd non-markdown file in a stack.
 */
const liveEntryCandidates = (entry: string): string[] => [entry, `${entry}.md`]

/**
 * Encode the current stack (blob shas) as the value of a living `?notes=` param.
 * Each note becomes its file path when one resolves from the HEAD file
 * list, so the link re-resolves to the latest version on open. A sha with no
 * known path — an already-drifted snapshot the sharer never pulled, or a path
 * the list can't express — is kept verbatim and stays pinned. Order is
 * preserved either way.
 */
export const stackToLiveQuery = (
  shas: ReadonlyArray<string>,
  files: ReadonlyArray<{ path?: string; sha?: string }>
): string =>
  shas
    .map((sha) => {
      const path = files.find((file) => file.sha === sha)?.path
      return (path && pathToLiveEntry(path)) || sha
    })
    .join(SEPARATOR)

/**
 * Resolve a living link back to current blob shas against the HEAD file list.
 * Takes the raw param value(s): each one is a comma-separated list, so a link
 * written as repeated params resolves just the same. An entry maps to its
 * latest sha; an entry already shaped like a sha is passed through (the pinned
 * fallback above); anything else — a renamed or deleted path — is dropped so the
 * view degrades gracefully instead of fetching a blob that no longer exists.
 */
export const resolveLiveQueryToShas = (
  raw: ReadonlyArray<string>,
  files: ReadonlyArray<{ path?: string; sha?: string }>
): string[] =>
  raw
    .flatMap((value) => value.split(SEPARATOR))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      for (const candidate of liveEntryCandidates(entry)) {
        const sha = files.find((file) => file.path === candidate)?.sha
        if (sha) return sha
      }
      return SHA_PATTERN.test(entry) ? entry : null
    })
    .filter((sha): sha is string => sha !== null)

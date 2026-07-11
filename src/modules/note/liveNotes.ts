// A shared link pins each stacked note to a blob sha, so the recipient sees the
// exact snapshot forever. A "living" link trades that pin for freshness: notes
// are referenced by their file path instead, and re-resolved to the latest blob
// sha against the repo's HEAD file list every time the link is opened.

const SHA_PATTERN = /^[0-9a-f]{40}$/i

/**
 * Encode the current stack (blob shas) as a living reference list. Each note
 * becomes its file path when one resolves from the HEAD file list, so the link
 * re-resolves to the latest version on open. A sha with no known path (e.g. an
 * already-drifted snapshot the sharer never pulled) is kept verbatim, staying
 * pinned — order is preserved either way.
 */
export const stackToLivePaths = (
  shas: ReadonlyArray<string>,
  files: ReadonlyArray<{ path?: string; sha?: string }>
): string[] =>
  shas.map((sha) => files.find((file) => file.sha === sha)?.path ?? sha)

/**
 * Resolve a living reference list back to current blob shas against the HEAD
 * file list: a path maps to its latest sha; an entry already shaped like a sha
 * is passed through (the pinned fallback above); anything else — a renamed or
 * deleted path — is dropped so the view degrades gracefully instead of trying
 * to fetch a blob that no longer exists.
 */
export const resolveLivePathsToShas = (
  entries: ReadonlyArray<string>,
  files: ReadonlyArray<{ path?: string; sha?: string }>
): string[] =>
  entries
    .map((entry) => {
      const latestSha = files.find((file) => file.path === entry)?.sha
      if (latestSha) return latestSha
      return SHA_PATTERN.test(entry) ? entry : null
    })
    .filter((sha): sha is string => sha !== null)

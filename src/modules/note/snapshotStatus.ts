/**
 * Return the note's current (latest) sha when `viewedSha` is NOT it — i.e. you
 * are viewing an older version — otherwise null. "Older" is not inferred from
 * the sha (a content hash has no order); it means "not the current sha for this
 * path" per the repo file list.
 *
 * The caller must supply `notePath`. For a current sha it comes from the file
 * list; for an older sha it comes from the cached snapshot's stored `path`
 * (notes viewed while current carry it). When the path can't be resolved
 * (foreign / evicted / pre-upgrade snapshot) this returns null and no banner is
 * shown — graceful, never a false claim. Content is never swapped.
 */
export const latestShaIfOlder = (
  viewedSha: string,
  notePath: string | undefined,
  files: ReadonlyArray<{ path?: string; sha?: string }>
): string | null => {
  if (!notePath) {
    return null
  }

  const currentSha = files.find((file) => file.path === notePath)?.sha

  return currentSha && currentSha !== viewedSha ? currentSha : null
}

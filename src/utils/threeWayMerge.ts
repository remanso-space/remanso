import { diff3Merge } from "node-diff3"

export interface ThreeWayMergeResult {
  clean: boolean
  merged: string
}

/**
 * Line-level 3-way merge. `ours` and `theirs` are both derived from `base`
 * (the common ancestor). When the two sets of edits are separated by at least
 * one unchanged line they merge automatically (`clean: true`); when they
 * overlap, `clean` is false and the caller should fall back to manual
 * resolution.
 *
 * Conservative by design: node-diff3 groups *consecutive* changed lines into a
 * single region, so edits to immediately-adjacent lines (no unchanged line
 * between them) are reported as a conflict even when they don't truly overlap.
 * This errs toward asking the user rather than risking a wrong auto-merge.
 *
 * `merged` is only meaningful when `clean` is true — conflicting regions are
 * dropped from it, so it must not be committed on a non-clean merge.
 */
export const threeWayMerge = (
  base: string,
  ours: string,
  theirs: string
): ThreeWayMergeResult => {
  // diff3Merge(a, o, b): a = ours, o = ancestor, b = theirs. The default
  // excludeFalseConflicts folds identical edits made on both sides.
  const regions = diff3Merge(ours, base, theirs, { stringSeparator: /\r?\n/ })

  const lines: string[] = []
  let clean = true
  for (const region of regions) {
    if (region.ok) lines.push(...region.ok)
    else clean = false
  }

  return { clean, merged: lines.join("\n") }
}

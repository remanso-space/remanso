import { describe, expect, it } from "vitest"

import { threeWayMerge } from "./threeWayMerge"

const base = "line1\nline2\nline3\nline4\nline5"

describe("threeWayMerge", () => {
  it("merges non-overlapping edits cleanly, keeping both changes", () => {
    const ours = "OURS1\nline2\nline3\nline4\nline5"
    const theirs = "line1\nline2\nline3\nline4\nTHEIRS5"

    const { clean, merged } = threeWayMerge(base, ours, theirs)

    expect(clean).toBe(true)
    expect(merged).toBe("OURS1\nline2\nline3\nline4\nTHEIRS5")
  })

  it("treats identical edits on both sides as clean (false conflict)", () => {
    const edited = "line1\nCHANGED\nline3\nline4\nline5"

    const { clean, merged } = threeWayMerge(base, edited, edited)

    expect(clean).toBe(true)
    expect(merged).toBe(edited)
  })

  it("flags overlapping edits on the same line as not clean", () => {
    const ours = "line1\nline2\nOURS3\nline4\nline5"
    const theirs = "line1\nline2\nTHEIRS3\nline4\nline5"

    const { clean } = threeWayMerge(base, ours, theirs)

    expect(clean).toBe(false)
  })

  it("returns the base unchanged when neither side edited", () => {
    const { clean, merged } = threeWayMerge(base, base, base)

    expect(clean).toBe(true)
    expect(merged).toBe(base)
  })

  it("returns our edits when only we changed", () => {
    const ours = "OURS1\nline2\nline3\nline4\nline5"

    const { clean, merged } = threeWayMerge(base, ours, base)

    expect(clean).toBe(true)
    expect(merged).toBe(ours)
  })

  it("returns their edits when only they changed", () => {
    const theirs = "line1\nline2\nline3\nline4\nTHEIRS5"

    const { clean, merged } = threeWayMerge(base, base, theirs)

    expect(clean).toBe(true)
    expect(merged).toBe(theirs)
  })

  it("preserves a trailing newline", () => {
    const baseNl = "a\nb\nc\n"
    const ours = "A\nb\nc\n"
    const theirs = "a\nb\nC\n"

    const { clean, merged } = threeWayMerge(baseNl, ours, theirs)

    expect(clean).toBe(true)
    expect(merged).toBe("A\nb\nC\n")
  })

  it("conservatively flags edits on immediately-adjacent lines as not clean", () => {
    // No unchanged line separates the two edits, so node-diff3 groups them
    // into one region and reports a conflict (git would merge this).
    const ours = "A\nline2\nline3\nline4\nline5"
    const theirs = "line1\nB\nline3\nline4\nline5"

    const { clean } = threeWayMerge(base, ours, theirs)

    expect(clean).toBe(false)
  })

  it("merges added lines on different sides without conflict", () => {
    const ours = "line1\nOURS-NEW\nline2\nline3\nline4\nline5"
    const theirs = "line1\nline2\nline3\nline4\nline5\nTHEIRS-NEW"

    const { clean, merged } = threeWayMerge(base, ours, theirs)

    expect(clean).toBe(true)
    expect(merged).toBe(
      "line1\nOURS-NEW\nline2\nline3\nline4\nline5\nTHEIRS-NEW"
    )
  })
})

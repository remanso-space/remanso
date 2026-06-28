import { describe, expect, it } from "vitest"

import { latestShaIfOlder } from "./snapshotStatus"

const files = [
  { path: "notes/a.md", sha: "current" },
  { path: "notes/b.md", sha: "other" }
]

describe("latestShaIfOlder", () => {
  it("returns the current sha when viewing an older version of a known note", () => {
    expect(latestShaIfOlder("old", "notes/a.md", files)).toBe("current")
  })

  it("returns null when viewing the current version", () => {
    expect(latestShaIfOlder("current", "notes/a.md", files)).toBeNull()
  })

  it("returns null when the path is unknown", () => {
    expect(latestShaIfOlder("old", undefined, files)).toBeNull()
    expect(latestShaIfOlder("old", "notes/missing.md", files)).toBeNull()
  })
})

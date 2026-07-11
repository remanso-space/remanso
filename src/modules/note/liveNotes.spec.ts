import { describe, expect, it } from "vitest"

import { resolveLivePathsToShas, stackToLivePaths } from "./liveNotes"

const files = [
  { path: "README.md", sha: "a".repeat(40) },
  { path: "notes/one.md", sha: "b".repeat(40) },
  { path: "notes/two.md", sha: "c".repeat(40) }
]

describe("stackToLivePaths", () => {
  it("maps each stacked sha to its current file path", () => {
    expect(stackToLivePaths(["b".repeat(40), "c".repeat(40)], files)).toEqual([
      "notes/one.md",
      "notes/two.md"
    ])
  })

  it("keeps a sha verbatim when no path resolves (drifted snapshot)", () => {
    const orphan = "d".repeat(40)
    expect(stackToLivePaths(["b".repeat(40), orphan], files)).toEqual([
      "notes/one.md",
      orphan
    ])
  })

  it("preserves order", () => {
    expect(stackToLivePaths(["c".repeat(40), "a".repeat(40)], files)).toEqual([
      "notes/two.md",
      "README.md"
    ])
  })
})

describe("resolveLivePathsToShas", () => {
  it("resolves each path to its latest sha", () => {
    expect(
      resolveLivePathsToShas(["notes/one.md", "notes/two.md"], files)
    ).toEqual(["b".repeat(40), "c".repeat(40)])
  })

  it("passes a sha-shaped entry through as a pinned fallback", () => {
    const orphan = "d".repeat(40)
    expect(resolveLivePathsToShas(["notes/one.md", orphan], files)).toEqual([
      "b".repeat(40),
      orphan
    ])
  })

  it("drops a renamed or deleted path so the view degrades gracefully", () => {
    expect(
      resolveLivePathsToShas(["notes/gone.md", "notes/two.md"], files)
    ).toEqual(["c".repeat(40)])
  })

  it("round-trips a live-shared stack back to the same shas", () => {
    const shas = ["a".repeat(40), "b".repeat(40)]
    expect(resolveLivePathsToShas(stackToLivePaths(shas, files), files)).toEqual(
      shas
    )
  })
})

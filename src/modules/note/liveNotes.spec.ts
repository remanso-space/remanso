import { describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import {
  LEGACY_LIVE_NOTES_PARAM,
  LIVE_NOTES_PARAM,
  resolveLiveQueryToShas,
  stackToLiveQuery
} from "./liveNotes"

const files = [
  { path: "README.md", sha: "a".repeat(40) },
  { path: "notes/one.md", sha: "b".repeat(40) },
  { path: "notes/two.md", sha: "c".repeat(40) },
  { path: "docs/diagram.svg", sha: "e".repeat(40) },
  { path: "notes/my note.md", sha: "f".repeat(40) },
  { path: "notes/a,b.md", sha: "9".repeat(40) }
]

describe("stackToLiveQuery", () => {
  it("joins the stack with commas and leaves the .md implied", () => {
    expect(stackToLiveQuery(["b".repeat(40), "c".repeat(40)], files)).toBe(
      "notes/one,notes/two"
    )
  })

  it("drops the implied .md at the repo root too", () => {
    expect(stackToLiveQuery(["a".repeat(40)], files)).toBe("README")
  })

  it("keeps a non-markdown extension", () => {
    expect(stackToLiveQuery(["e".repeat(40)], files)).toBe("docs/diagram.svg")
  })

  it("keeps a path holding a space, which needs no escaping here", () => {
    expect(stackToLiveQuery(["f".repeat(40)], files)).toBe("notes/my note")
  })

  it("pins a path holding a comma to its sha, since the list can't hold it", () => {
    const sha = "9".repeat(40)
    expect(stackToLiveQuery([sha], files)).toBe(sha)
  })

  it("keeps a sha verbatim when no path resolves (drifted snapshot)", () => {
    const orphan = "d".repeat(40)
    expect(stackToLiveQuery(["b".repeat(40), orphan], files)).toBe(
      `notes/one,${orphan}`
    )
  })

  it("preserves order", () => {
    expect(stackToLiveQuery(["c".repeat(40), "a".repeat(40)], files)).toBe(
      "notes/two,README"
    )
  })
})

describe("resolveLiveQueryToShas", () => {
  it("resolves a comma-separated list to the latest shas", () => {
    expect(resolveLiveQueryToShas(["notes/one,notes/two"], files)).toEqual([
      "b".repeat(40),
      "c".repeat(40)
    ])
  })

  it("resolves a root entry with no extension", () => {
    expect(resolveLiveQueryToShas(["README"], files)).toEqual(["a".repeat(40)])
  })

  it("still resolves entries written with the .md, so older links keep working", () => {
    expect(resolveLiveQueryToShas(["notes/one.md,README.md"], files)).toEqual([
      "b".repeat(40),
      "a".repeat(40)
    ])
  })

  it("resolves repeated params, the shape older links used", () => {
    expect(
      resolveLiveQueryToShas(["notes/one.md", "notes/two.md"], files)
    ).toEqual(["b".repeat(40), "c".repeat(40)])
  })

  it("resolves a non-markdown entry", () => {
    expect(resolveLiveQueryToShas(["docs/diagram.svg"], files)).toEqual([
      "e".repeat(40)
    ])
  })

  it("tolerates padding and empty segments from a hand-edited link", () => {
    expect(resolveLiveQueryToShas([" notes/one , ,notes/two,"], files)).toEqual([
      "b".repeat(40),
      "c".repeat(40)
    ])
  })

  it("passes a sha-shaped entry through as a pinned fallback", () => {
    const orphan = "d".repeat(40)
    expect(resolveLiveQueryToShas([`notes/one,${orphan}`], files)).toEqual([
      "b".repeat(40),
      orphan
    ])
  })

  it("drops a renamed or deleted path so the view degrades gracefully", () => {
    expect(resolveLiveQueryToShas(["notes/gone,notes/two"], files)).toEqual([
      "c".repeat(40)
    ])
  })

  it("round-trips a live-shared stack back to the same shas", () => {
    const shas = ["a".repeat(40), "b".repeat(40), "f".repeat(40)]
    expect(
      resolveLiveQueryToShas([stackToLiveQuery(shas, files)], files)
    ).toEqual(shas)
  })

  it("round-trips a stack holding a comma path, via its pinned sha", () => {
    const shas = ["b".repeat(40), "9".repeat(40)]
    expect(
      resolveLiveQueryToShas([stackToLiveQuery(shas, files)], files)
    ).toEqual(shas)
  })
})

// The slash and comma only survive unescaped because vue-router's encoder leaves
// them alone. These cover that end to end, so a change there shows up here rather
// than in an ugly shared link.
describe("the living link URL", () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:user/:repo", component: {} }]
  })

  const hrefFor = (shas: string[]) =>
    router.resolve({
      path: "/jcalixte/typewriter",
      query: { [LIVE_NOTES_PARAM]: stackToLiveQuery(shas, files) }
    }).href

  // Mirrors useResolveLiveNotes: the current param, falling back to the legacy one.
  const reopen = (href: string) => {
    const query = router.resolve(href).query
    const raw = query[LIVE_NOTES_PARAM] ?? query[LEGACY_LIVE_NOTES_PARAM]
    return resolveLiveQueryToShas([raw].flat() as string[], files)
  }

  it("keeps the slashes and separates notes with a comma", () => {
    expect(hrefFor(["b".repeat(40), "c".repeat(40)])).toBe(
      "/jcalixte/typewriter?notes=notes/one,notes/two"
    )
  })

  it("reopens to the same shas", () => {
    const shas = ["b".repeat(40), "c".repeat(40)]
    expect(reopen(hrefFor(shas))).toEqual(shas)
  })

  it("reopens a path holding a space", () => {
    const shas = ["f".repeat(40)]
    expect(reopen(hrefFor(shas))).toEqual(shas)
  })

  it("reopens a link shared under the older param name, in its repeated form", () => {
    expect(
      reopen(
        "/jcalixte/typewriter?liveNotes=notes/one.md&liveNotes=notes/two.md"
      )
    ).toEqual(["b".repeat(40), "c".repeat(40)])
  })

  it("prefers the current param when a link somehow carries both", () => {
    expect(
      reopen("/jcalixte/typewriter?notes=notes/two&liveNotes=notes/one")
    ).toEqual(["c".repeat(40)])
  })
})

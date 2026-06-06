import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./octo", () => ({
  getOctokit: vi.fn(),
  runWithAuthRetry: vi.fn()
}))

// Stub heavyweight transitive imports so loading repo.ts doesn't spin up the
// data Web Worker or the full markdown rendering stack.
vi.mock("@/hooks/useMarkdown.hook", () => ({
  markdownBuilder: () => ({ render: (s: string) => s })
}))
vi.mock("@/modules/note/cache/prepareNoteCache", () => ({
  prepareNoteCache: () => ({
    getCachedNote: async () => ({ note: null }),
    saveCacheNote: vi.fn()
  })
}))

import { getOctokit, runWithAuthRetry } from "./octo"
import { getFiles, queryFileContent } from "./repo"

const makeOctokitWithRequest = (impl: (route: string, params: unknown) => unknown) => ({
  request: vi.fn(impl)
})

describe("getFiles", () => {
  beforeEach(() => {
    vi.mocked(getOctokit).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns empty array when owner is missing", async () => {
    expect(await getFiles("", "repo")).toEqual([])
    expect(getOctokit).not.toHaveBeenCalled()
  })

  it("returns empty array when repo is missing", async () => {
    expect(await getFiles("owner", "")).toEqual([])
    expect(getOctokit).not.toHaveBeenCalled()
  })

  it("returns empty array when there are no commits", async () => {
    const octokit = makeOctokitWithRequest((route) => {
      if (route === "GET /repos/{owner}/{repo}/commits") {
        return { data: [] }
      }
      throw new Error("unexpected route " + route)
    })
    vi.mocked(getOctokit).mockResolvedValue(octokit as never)

    expect(await getFiles("owner", "repo")).toEqual([])
  })

  it("fetches the tree from the latest commit and filters out non-blob entries", async () => {
    const octokit = makeOctokitWithRequest((route, params) => {
      if (route === "GET /repos/{owner}/{repo}/commits") {
        return {
          data: [{ commit: { tree: { sha: "TREE_SHA" } } }]
        }
      }
      if (route === "GET /repos/{owner}/{repo}/git/trees/{tree_sha}") {
        expect((params as { tree_sha: string }).tree_sha).toBe("TREE_SHA")
        expect((params as { recursive: string }).recursive).toBe("true")
        return {
          data: {
            tree: [
              { path: "README.md", type: "blob", sha: "a" },
              { path: "src", type: "tree", sha: "b" },
              { path: "src/note.md", type: "blob", sha: "c" }
            ]
          }
        }
      }
      throw new Error("unexpected route " + route)
    })
    vi.mocked(getOctokit).mockResolvedValue(octokit as never)

    const files = await getFiles("owner", "repo")

    expect(files.map((f) => f.path)).toEqual(["README.md", "src/note.md"])
  })
})

describe("queryFileContent", () => {
  beforeEach(() => {
    vi.mocked(runWithAuthRetry).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null when owner or repo is missing", async () => {
    expect(await queryFileContent("", "repo", "sha")).toBeNull()
    expect(await queryFileContent("owner", "", "sha")).toBeNull()
    expect(runWithAuthRetry).not.toHaveBeenCalled()
  })

  it("returns the blob content via runWithAuthRetry", async () => {
    vi.mocked(runWithAuthRetry).mockImplementation(async (call) => {
      const octokit = {
        request: vi.fn().mockResolvedValue({
          data: { content: "BASE64" }
        })
      }
      return call(octokit as never)
    })

    expect(await queryFileContent("owner", "repo", "SHA")).toBe("BASE64")
  })

  it("returns null and swallows errors when the call fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.mocked(runWithAuthRetry).mockRejectedValue(new Error("boom"))

    expect(await queryFileContent("owner", "repo", "SHA")).toBeNull()
    expect(warn).toHaveBeenCalled()
  })
})

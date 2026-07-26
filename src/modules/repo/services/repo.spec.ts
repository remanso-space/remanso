import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { reposGet } = vi.hoisted(() => ({ reposGet: vi.fn() }))

vi.mock("./octo", () => ({
  getOctokit: vi.fn().mockResolvedValue({
    repos: { get: reposGet }
  }),
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
import {
  getFiles,
  getRepoPermission,
  getUserSettingsContent,
  queryFileContent
} from "./repo"

const makeOctokitWithRequest = (
  impl: (route: string, params: unknown) => unknown
) => ({
  request: vi.fn(impl)
})

describe("getRepoPermission", () => {
  beforeEach(() => {
    reposGet.mockReset()
    vi.mocked(getOctokit).mockResolvedValue({
      repos: { get: reposGet }
    } as never)
  })

  it("returns true when permissions.push is true", async () => {
    reposGet.mockResolvedValue({
      data: { permissions: { push: true } }
    })
    await expect(getRepoPermission("owner", "repo")).resolves.toBe(true)
  })

  it("returns false when permissions.push is false", async () => {
    reposGet.mockResolvedValue({
      data: { permissions: { push: false } }
    })
    await expect(getRepoPermission("owner", "repo")).resolves.toBe(false)
  })

  it("returns false when permissions is missing (anonymous request)", async () => {
    reposGet.mockResolvedValue({
      data: {}
    })
    await expect(getRepoPermission("owner", "repo")).resolves.toBe(false)
  })

  it("returns false when owner or repo is empty", async () => {
    await expect(getRepoPermission("", "repo")).resolves.toBe(false)
    await expect(getRepoPermission("owner", "")).resolves.toBe(false)
    expect(reposGet).not.toHaveBeenCalled()
  })
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

describe("getUserSettingsContent", () => {
  beforeEach(() => {
    vi.mocked(runWithAuthRetry).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const configFiles = [
    { path: ".remanso.json", type: "blob", sha: "CFG" }
  ] as never

  const withConfig = (json: object) => {
    const base64 = btoa(JSON.stringify(json))
    vi.mocked(runWithAuthRetry).mockImplementation(async (call) => {
      const octokit = {
        request: vi.fn().mockResolvedValue({ data: { content: base64 } })
      }
      return call(octokit as never)
    })
  }

  it("maps the `h` key to chosenHeadingFont and `p` to chosenBodyFont", async () => {
    withConfig({ h: "Lora", p: "Inter" })

    const settings = await getUserSettingsContent("owner", "repo", configFiles)

    expect(settings?.chosenHeadingFont).toBe("Lora")
    expect(settings?.chosenBodyFont).toBe("Inter")
  })

  it("falls back to the legacy `t` key for chosenHeadingFont", async () => {
    withConfig({ t: "Merriweather", p: "Inter" })

    const settings = await getUserSettingsContent("owner", "repo", configFiles)

    expect(settings?.chosenHeadingFont).toBe("Merriweather")
  })

  it("prefers `h` over the legacy `t` when both are present", async () => {
    withConfig({ h: "Lora", t: "Merriweather" })

    const settings = await getUserSettingsContent("owner", "repo", configFiles)

    expect(settings?.chosenHeadingFont).toBe("Lora")
  })

  it("returns null when there is no .remanso.json", async () => {
    expect(
      await getUserSettingsContent("owner", "repo", [] as never)
    ).toBeNull()
  })
})

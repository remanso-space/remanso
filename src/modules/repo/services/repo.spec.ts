import { beforeEach, describe, expect, it, vi } from "vitest"

const { reposGet } = vi.hoisted(() => ({ reposGet: vi.fn() }))

vi.mock("@/modules/repo/services/octo", () => ({
  getOctokit: vi.fn().mockResolvedValue({
    repos: { get: reposGet }
  }),
  runWithAuthRetry: vi.fn()
}))

vi.mock("@/hooks/useMarkdown.hook", () => ({
  markdownBuilder: () => ({ render: (s: string) => s })
}))

vi.mock("@/modules/note/cache/prepareNoteCache", () => ({
  prepareNoteCache: () => ({
    getCachedNote: vi.fn().mockResolvedValue({ note: null }),
    saveCacheNote: vi.fn()
  })
}))

import { getRepoPermission } from "./repo"

describe("getRepoPermission", () => {
  beforeEach(() => {
    reposGet.mockReset()
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

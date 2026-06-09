import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"

const {
  fetchLatestSha,
  addFile,
  getRawContent,
  saveCacheNote,
  queryFileContent
} = vi.hoisted(() => ({
  fetchLatestSha: vi.fn(),
  addFile: vi.fn(),
  getRawContent: vi.fn((s: string) => s),
  saveCacheNote: vi.fn(),
  queryFileContent: vi.fn()
}))

vi.mock("@/hooks/useGitHubContent.hook", () => ({
  useGitHubContent: () => ({ fetchLatestSha })
}))

vi.mock("@/hooks/useMarkdown.hook", () => ({
  markdownBuilder: () => ({ getRawContent, render: (s: string) => s })
}))

vi.mock("@/modules/note/cache/prepareNoteCache", () => ({
  prepareNoteCache: () => ({
    getCachedNote: async () => ({ note: null }),
    saveCacheNote
  })
}))

vi.mock("@/modules/repo/services/repo", () => ({
  queryFileContent
}))

vi.mock("@/modules/repo/store/userRepo.store", () => ({
  useUserRepoStore: () => ({ addFile })
}))

import { useNoteFreshness } from "./useNoteFreshness.hook"

const setup = (overrides: { sha?: string; path?: string; edited?: string | null } = {}) => {
  setActivePinia(createPinia())
  const sha = ref(overrides.sha ?? "local-sha")
  const path = ref(overrides.path ?? "note.md")
  const getEditedSha = vi.fn().mockResolvedValue(overrides.edited ?? null)
  return useNoteFreshness({
    user: "alice",
    repo: "notes",
    sha,
    path,
    getEditedSha
  })
}

// Make performance.now() return values where elapsed > MIN_SPINNER_MS so the
// 400ms spinner-min-time wait is skipped.
const skipSpinnerWait = () => {
  let call = 0
  vi.spyOn(performance, "now").mockImplementation(() =>
    call++ === 0 ? 0 : 10_000
  )
}

describe("useNoteFreshness.check", () => {
  beforeEach(() => {
    fetchLatestSha.mockReset()
    addFile.mockReset()
    saveCacheNote.mockReset()
    queryFileContent.mockReset()
    skipSpinnerWait()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does nothing when path is empty", async () => {
    const { check, status } = setup({ path: "" })

    await check()

    expect(status.value).toBe("unknown")
    expect(fetchLatestSha).not.toHaveBeenCalled()
  })

  it("sets status to 'verified' when remote sha matches local sha", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "ok", sha: "local-sha" })

    const { check, status, latestSha, lastCheckedAt } = setup()
    await check()

    expect(status.value).toBe("verified")
    expect(latestSha.value).toBe("local-sha")
    expect(lastCheckedAt.value).toBeInstanceOf(Date)
  })

  it("sets status to 'outdated' when remote sha differs from local sha", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "ok", sha: "remote-sha" })

    const { check, status } = setup()
    await check()

    expect(status.value).toBe("outdated")
  })

  it("prefers the edited sha over the live sha when comparing", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "ok", sha: "edited-sha" })

    const { check, status } = setup({ sha: "live-sha", edited: "edited-sha" })
    await check()

    expect(status.value).toBe("verified")
  })

  it("sets status to 'unauthorized' on auth failure", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "unauthorized" })

    const { check, status } = setup()
    await check()

    expect(status.value).toBe("unauthorized")
  })

  it("sets status to 'offline' on network failure", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "offline" })

    const { check, status } = setup()
    await check()

    expect(status.value).toBe("offline")
  })

  it("sets status to 'offline' when remote returns sha=null (e.g. directory)", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "ok", sha: null })

    const { check, status } = setup()
    await check()

    expect(status.value).toBe("offline")
  })
})

describe("useNoteFreshness.pullLatest", () => {
  beforeEach(() => {
    fetchLatestSha.mockReset()
    addFile.mockReset()
    saveCacheNote.mockReset()
    queryFileContent.mockReset()
    getRawContent.mockClear()
    skipSpinnerWait()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns raw=null with no failureStatus when path is empty", async () => {
    const { pullLatest } = setup({ path: "" })

    expect(await pullLatest()).toEqual({ raw: null, failureStatus: null })
    expect(fetchLatestSha).not.toHaveBeenCalled()
  })

  it("returns the fetched content and updates state on success", async () => {
    fetchLatestSha.mockResolvedValue({ kind: "ok", sha: "remote-sha" })
    queryFileContent.mockResolvedValue("BASE64")
    getRawContent.mockReturnValue("# raw")

    const { pullLatest, status, latestSha, lastCheckedAt } = setup()
    const result = await pullLatest()

    expect(result).toEqual({ raw: "# raw", failureStatus: null })
    expect(status.value).toBe("verified")
    expect(latestSha.value).toBe("remote-sha")
    expect(lastCheckedAt.value).toBeInstanceOf(Date)
    expect(addFile).toHaveBeenCalledWith({ path: "note.md", sha: "remote-sha" })
    expect(saveCacheNote).toHaveBeenCalled()
  })

  it("surfaces 'unauthorized' failureStatus when remote resolve is unauthorized", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    fetchLatestSha.mockResolvedValue({ kind: "unauthorized" })

    const { pullLatest, status } = setup()
    expect(await pullLatest()).toEqual({
      raw: null,
      failureStatus: "unauthorized"
    })
    expect(status.value).toBe("unauthorized")
  })

  it("surfaces 'offline' failureStatus when remote resolve is offline", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    fetchLatestSha.mockResolvedValue({ kind: "offline" })

    const { pullLatest, status } = setup()
    expect(await pullLatest()).toEqual({
      raw: null,
      failureStatus: "offline"
    })
    expect(status.value).toBe("offline")
  })

  it("surfaces 'offline' failureStatus when blob content fetch fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    fetchLatestSha.mockResolvedValue({ kind: "ok", sha: "remote-sha" })
    queryFileContent.mockResolvedValue(null)

    const { pullLatest, status } = setup()
    expect(await pullLatest()).toEqual({
      raw: null,
      failureStatus: "offline"
    })
    expect(status.value).toBe("offline")
  })

  it("uses the cached latestSha to skip a redundant fetchLatestSha call", async () => {
    fetchLatestSha.mockResolvedValueOnce({ kind: "ok", sha: "cached-sha" })
    queryFileContent.mockResolvedValue("BASE64")

    const api = setup()
    await api.check() // populates latestSha
    expect(fetchLatestSha).toHaveBeenCalledTimes(1)

    fetchLatestSha.mockClear()
    await api.pullLatest()

    expect(fetchLatestSha).not.toHaveBeenCalled()
    expect(queryFileContent).toHaveBeenCalledWith("alice", "notes", "cached-sha")
  })
})

import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/data/data", () => ({
  data: {
    get: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined)
  },
  generateId: (type: string, id: string) => `${type}-${id}`
}))

vi.mock("@/modules/repo/services/repo", () => ({
  getFiles: vi.fn().mockResolvedValue([]),
  getMainReadme: vi.fn().mockResolvedValue(null),
  getCachedMainReadme: vi.fn().mockResolvedValue(null),
  getUserSettingsContent: vi.fn().mockResolvedValue(null),
  getRepoPermission: vi.fn().mockResolvedValue(false)
}))

vi.mock("@/modules/user/service/signIn", () => ({
  refreshToken: vi.fn().mockResolvedValue(null)
}))

import { data } from "@/data/data"
import {
  getCachedMainReadme,
  getFiles,
  getMainReadme,
  getRepoPermission,
  getUserSettingsContent
} from "@/modules/repo/services/repo"

import { useUserRepoStore } from "./userRepo.store"

const flushAsync = () => new Promise((r) => setTimeout(r, 0))

describe("userRepo store — synchronous mutations", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("resetUserRepo clears user, repo, files, and settings", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"
    store.files = [{ sha: "x", path: "a.md", type: "blob" }] as never
    store.userSettings = { $type: 1 } as never

    store.resetUserRepo()

    expect(store.user).toBe("")
    expect(store.repo).toBe("")
    expect(store.files).toEqual([])
    expect(store.userSettings).toBeUndefined()
  })

  it("resetFiles clears files and sets readme to null", () => {
    const store = useUserRepoStore()
    store.files = [{ sha: "x", path: "a.md", type: "blob" }] as never
    store.readme = "<p>hi</p>"

    store.resetFiles()

    expect(store.files).toEqual([])
    expect(store.readme).toBeNull()
  })

  it("addFile appends a new file with a unique sha", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"
    store.files = [{ sha: "old", path: "a.md", type: "blob" }] as never

    store.addFile({ sha: "new", path: "b.md", type: "blob" } as never)

    expect(store.files.map((f) => f.sha)).toEqual(["old", "new"])
    expect(vi.mocked(data.update)).toHaveBeenCalled()
  })

  it("addFile is a no-op when the sha already exists", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"
    store.files = [{ sha: "x", path: "a.md", type: "blob" }] as never

    store.addFile({ sha: "x", path: "duplicate.md", type: "blob" } as never)

    expect(store.files).toHaveLength(1)
    expect(vi.mocked(data.update)).not.toHaveBeenCalled()
  })

  it("addFile is a no-op when sha is missing", () => {
    const store = useUserRepoStore()
    store.files = []

    store.addFile({ path: "no-sha.md", type: "blob" } as never)

    expect(store.files).toHaveLength(0)
    expect(vi.mocked(data.update)).not.toHaveBeenCalled()
  })

  it("addFile replaces the entry at the same path when content (sha) changed", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"
    store.files = [{ sha: "old", path: "a.md", type: "blob" }] as never

    store.addFile({ sha: "new", path: "a.md", type: "blob" } as never)

    expect(store.files).toEqual([{ sha: "new", path: "a.md", type: "blob" }])
    expect(vi.mocked(data.update)).toHaveBeenCalled()
  })

  it("setFontFamily initializes userSettings when absent and persists to localStorage", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"

    store.setFontFamily("Inter")

    expect(store.userSettings?.chosenFontFamily).toBe("Inter")
    const persisted = JSON.parse(
      localStorage.getItem("remanso:layout:alice:notes") as string
    )
    expect(persisted.chosenFontFamily).toBe("Inter")
  })

  it("setFontSize, setHeadingFont, setBodyFont each persist their respective field", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"

    store.setFontSize("18px")
    store.setHeadingFont("Serif")
    store.setBodyFont("Sans")

    const persisted = JSON.parse(
      localStorage.getItem("remanso:layout:alice:notes") as string
    )
    expect(persisted.chosenFontSize).toBe("18px")
    expect(persisted.chosenHeadingFont).toBe("Serif")
    expect(persisted.chosenBodyFont).toBe("Sans")
  })

  it("swapFonts exchanges the heading and body fonts and persists", () => {
    const store = useUserRepoStore()
    store.user = "alice"
    store.repo = "notes"
    store.setHeadingFont("Lora")
    store.setBodyFont("Inter")

    store.swapFonts()

    expect(store.userSettings?.chosenHeadingFont).toBe("Inter")
    expect(store.userSettings?.chosenBodyFont).toBe("Lora")
    const persisted = JSON.parse(
      localStorage.getItem("remanso:layout:alice:notes") as string
    )
    expect(persisted.chosenHeadingFont).toBe("Inter")
    expect(persisted.chosenBodyFont).toBe("Lora")
  })
})

describe("userRepo store — setUserRepo", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(data.get).mockResolvedValue(null as never)
    vi.mocked(getFiles).mockResolvedValue([])
    vi.mocked(getMainReadme).mockResolvedValue(null)
    vi.mocked(getCachedMainReadme).mockResolvedValue(null)
    vi.mocked(getUserSettingsContent).mockResolvedValue(null)
    vi.mocked(getRepoPermission).mockResolvedValue(false)
  })

  it("sets user and repo immediately and clears loadError", async () => {
    const store = useUserRepoStore()
    store.loadError = "auth"

    await store.setUserRepo("alice", "notes")

    expect(store.user).toBe("alice")
    expect(store.repo).toBe("notes")
    expect(store.loadError).toBeNull()
  })

  it("migrates the legacy chosenTitleFont localStorage key to chosenHeadingFont", async () => {
    localStorage.setItem(
      "remanso:layout:alice:notes",
      JSON.stringify({ chosenTitleFont: "Lora" })
    )

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.userSettings?.chosenHeadingFont).toBe("Lora")
    const persisted = JSON.parse(
      localStorage.getItem("remanso:layout:alice:notes") as string
    )
    expect(persisted.chosenHeadingFont).toBe("Lora")
    expect(persisted.chosenTitleFont).toBeUndefined()
  })

  it("populates files from getFiles on success", async () => {
    vi.mocked(getFiles).mockResolvedValue([
      { sha: "a", path: "x.md", type: "blob" } as never
    ])

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.files.map((f) => f.sha)).toEqual(["a"])
  })

  it("sets readme from getMainReadme on success", async () => {
    vi.mocked(getMainReadme).mockResolvedValue("<p>hi</p>")

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.readme).toBe("<p>hi</p>")
  })

  it("classifies 401 errors from getFiles as auth", async () => {
    vi.mocked(getFiles).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 })
    )
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.loadError).toBe("auth")
  })

  it("classifies TimeoutError as network", async () => {
    vi.mocked(getFiles).mockRejectedValue(
      Object.assign(new Error("Timed out"), { name: "TimeoutError" })
    )
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.loadError).toBe("network")
  })

  it("classifies 500-range errors as network", async () => {
    vi.mocked(getFiles).mockRejectedValue(
      Object.assign(new Error("Server error"), { status: 503 })
    )
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.loadError).toBe("network")
  })

  it("does NOT surface loadError from getMainReadme when a cached readme is present", async () => {
    vi.mocked(getCachedMainReadme).mockResolvedValue("<p>cached</p>")
    vi.mocked(getMainReadme).mockRejectedValue(
      Object.assign(new Error("Server error"), { status: 503 })
    )
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.readme).toBe("<p>cached</p>")
    expect(store.loadError).toBeNull()
  })

  it("surfaces loadError from getMainReadme when no cached readme is present", async () => {
    vi.mocked(getCachedMainReadme).mockResolvedValue(null)
    vi.mocked(getMainReadme).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 })
    )
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const store = useUserRepoStore()
    await store.setUserRepo("alice", "notes")
    await flushAsync()
    await flushAsync()

    expect(store.readme).toBeNull()
    expect(store.loadError).toBe("auth")
  })

  it("ignores stale getFiles results when a newer setUserRepo has been called (race guard)", async () => {
    let resolveStale: (files: never[]) => void = () => {}
    vi.mocked(getFiles).mockImplementationOnce(
      () =>
        new Promise<never[]>((r) => {
          resolveStale = r
        })
    )
    vi.mocked(getFiles).mockImplementationOnce(async () => [
      { sha: "fresh", path: "fresh.md", type: "blob" } as never
    ])

    const store = useUserRepoStore()

    await store.setUserRepo("alice", "stale-repo")
    await store.setUserRepo("alice", "fresh-repo")

    resolveStale([{ sha: "stale", path: "stale.md", type: "blob" } as never])
    await flushAsync()
    await flushAsync()

    expect(store.repo).toBe("fresh-repo")
    expect(store.files.map((f) => f.sha)).toEqual(["fresh"])
  })
})

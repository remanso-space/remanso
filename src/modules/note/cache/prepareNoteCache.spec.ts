import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/data/data", () => ({
  data: {
    get: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined)
  },
  generateId: (type: string, id: string) => `${type}-${id}`
}))

const addFile = vi.fn()
vi.mock("@/modules/repo/store/userRepo.store", () => ({
  useUserRepoStore: () => ({ addFile })
}))

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"

import { prepareNoteCache } from "./prepareNoteCache"

const writtenIds = () =>
  vi.mocked(data.update).mock.calls.map((c) => (c[0] as { _id: string })._id)

describe("prepareNoteCache.saveCacheNote", () => {
  beforeEach(() => {
    vi.mocked(data.update).mockClear()
    addFile.mockClear()
  })

  it("on edit, keys content by the NEW sha and leaves the viewed sha untouched", async () => {
    const { saveCacheNote } = prepareNoteCache("oldSha", "notes/a.md")

    await saveCacheNote("new content", {
      editedSha: "newSha",
      path: "notes/a.md"
    })

    const ids = writtenIds()
    // immutable snapshot under the content's own (new) sha
    expect(ids).toContain(generateId(DataType.Note, "newSha"))
    // latest pointer under the path
    expect(ids).toContain(generateId(DataType.Note, "notes/a.md"))
    // the previously-viewed sha stays immutable
    expect(ids).not.toContain(generateId(DataType.Note, "oldSha"))
  })

  it("on a fresh load (no editedSha), keys content by the viewed sha", async () => {
    const { saveCacheNote } = prepareNoteCache("sha0", "notes/a.md")

    await saveCacheNote("content")

    expect(writtenIds()).toContain(generateId(DataType.Note, "sha0"))
  })

  it("registers the new sha against the path in the store", async () => {
    const { saveCacheNote } = prepareNoteCache("oldSha", "notes/a.md")

    await saveCacheNote("new content", {
      editedSha: "newSha",
      path: "notes/a.md"
    })

    expect(addFile).toHaveBeenCalledWith({ path: "notes/a.md", sha: "newSha" })
  })
})

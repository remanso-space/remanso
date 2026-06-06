import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const uploadBinaryFile = vi.fn()
const registerUploadedFile = vi.fn()

vi.mock("@/hooks/useGitHubContent.hook", () => ({
  useGitHubContent: () => ({ uploadBinaryFile })
}))

vi.mock("@/modules/repo/store/userRepo.store", () => ({
  useUserRepoStore: () => ({
    files: [{ path: "alice/notes/already-here.png", sha: "x" }],
    registerUploadedFile
  })
}))

vi.mock("@/utils/notif", () => ({
  errorMessage: vi.fn()
}))

import { errorMessage } from "@/utils/notif"

import { useImageUpload } from "./useImageUpload.hook"

const makeFile = (name: string, body = "fake-image-bytes") =>
  new File([body], name, { type: "image/png" })

describe("useImageUpload", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    uploadBinaryFile.mockReset()
    registerUploadedFile.mockReset()
    vi.mocked(errorMessage).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null and shows an error when notePath is missing", async () => {
    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: undefined
    })

    expect(await uploadImage(makeFile("img.png"))).toBeNull()
    expect(errorMessage).toHaveBeenCalledWith("❌ Image upload failed")
    expect(uploadBinaryFile).not.toHaveBeenCalled()
  })

  it("uploads to the note's directory using the note basename and the file extension", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: "new-sha", conflict: false })

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "alice/notes/my-note.md"
    })

    const result = await uploadImage(makeFile("photo.PNG"))

    expect(result).toEqual({ filename: "my-note.png" })
    expect(uploadBinaryFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "alice/notes/my-note.png"
      })
    )
  })

  it("deduplicates filenames against existing files in the store", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: "new-sha", conflict: false })

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "alice/notes/already-here.md"
    })

    const result = await uploadImage(makeFile("photo.png"))

    expect(result?.filename).toBe("already-here-2.png")
  })

  it("returns null on conflict and does NOT register the file", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: null, conflict: true })

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    expect(await uploadImage(makeFile("img.png"))).toBeNull()
    expect(registerUploadedFile).not.toHaveBeenCalled()
  })

  it("registers the uploaded file in the store on success", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: "abc", conflict: false })
    const file = makeFile("img.png", "data")

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    await uploadImage(file)

    expect(registerUploadedFile).toHaveBeenCalledWith({
      path: "x/note.png",
      sha: "abc",
      type: "blob",
      size: file.size
    })
  })

  it("falls back to .png when the file name has no extension", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: "abc", conflict: false })

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    await uploadImage(makeFile("noextension"))

    expect(uploadBinaryFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "x/note.png" })
    )
  })

  it("uses the root path when the note is at the repo root", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: "abc", conflict: false })

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "root.md"
    })

    await uploadImage(makeFile("img.png"))

    expect(uploadBinaryFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: "root.png" })
    )
  })

  it("returns null and notifies on unexpected errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    uploadBinaryFile.mockRejectedValue(new Error("boom"))

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    expect(await uploadImage(makeFile("img.png"))).toBeNull()
    expect(errorMessage).toHaveBeenCalledWith("❌ Image upload failed")
  })
})

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

const shrinkImageFile = vi.fn<(file: File) => Promise<File | null>>()

vi.mock("@/utils/shrinkImageFile", () => ({
  shrinkImageFile: (file: File) => shrinkImageFile(file)
}))

import { errorMessage } from "@/utils/notif"

import { useImageUpload } from "./useImageUpload.hook"

const makeFile = (name: string, body = "fake-image-bytes") =>
  new File([body], name, { type: "image/png" })

const makeHeavyFile = (name: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type: "image/jpeg" })

describe("useImageUpload", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    uploadBinaryFile.mockReset()
    registerUploadedFile.mockReset()
    shrinkImageFile.mockReset()
    shrinkImageFile.mockResolvedValue(null)
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

  it("uploads the shrunk file, under its own extension", async () => {
    uploadBinaryFile.mockResolvedValue({ sha: "abc", conflict: false })
    const shrunk = new File([new Uint8Array(2000)], "photo.jpg", {
      type: "image/jpeg"
    })
    shrinkImageFile.mockResolvedValue(shrunk)

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    const result = await uploadImage(
      makeHeavyFile("PXL_20260809.jpg", 9_000_000)
    )

    expect(result).toEqual({ filename: "note.jpg" })
    expect(registerUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({ size: shrunk.size })
    )
  })

  it("refuses an oversized file it could not shrink, without uploading", async () => {
    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    expect(await uploadImage(makeHeavyFile("huge.gif", 9_000_000))).toBeNull()
    expect(errorMessage).toHaveBeenCalledWith(
      "❌ Image is too large to upload (9 MB)"
    )
    expect(uploadBinaryFile).not.toHaveBeenCalled()
  })

  it("gives up on a photo whose bytes never arrive, rather than hanging", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.useFakeTimers()

    const file = makeHeavyFile("cloud-only.jpg", 9_000_000)
    vi.spyOn(file, "arrayBuffer").mockReturnValue(
      new Promise<ArrayBuffer>(() => {})
    )

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    const pending = uploadImage(file)
    await vi.advanceTimersByTimeAsync(46_000)

    expect(await pending).toBeNull()
    expect(errorMessage).toHaveBeenCalledWith(
      "❌ Could not read that image from your phone"
    )
    expect(uploadBinaryFile).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it("reports a picker entry with no bytes behind it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const file = makeHeavyFile("stale.jpg", 9_000_000)
    vi.spyOn(file, "arrayBuffer").mockResolvedValue(new ArrayBuffer(0))

    const { uploadImage } = useImageUpload({
      user: "alice",
      repo: "notes",
      notePath: "x/note.md"
    })

    expect(await uploadImage(file)).toBeNull()
    expect(errorMessage).toHaveBeenCalledWith(
      "❌ Could not read that image from your phone"
    )
    expect(uploadBinaryFile).not.toHaveBeenCalled()
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

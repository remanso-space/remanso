import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/modules/repo/services/octo", () => ({
  getOctokit: vi.fn(),
  runWithAuthRetry: vi.fn()
}))

vi.mock("@/utils/notif", () => ({
  confirmMessage: vi.fn(),
  errorMessage: vi.fn()
}))

import { getOctokit, runWithAuthRetry } from "@/modules/repo/services/octo"
import { confirmMessage, errorMessage } from "@/utils/notif"

import { useGitHubContent } from "./useGitHubContent.hook"

const make = () => useGitHubContent({ user: "alice", repo: "notes" })

describe("useGitHubContent.fetchLatestSha", () => {
  beforeEach(() => {
    vi.mocked(runWithAuthRetry).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns the sha from a file response", async () => {
    vi.mocked(runWithAuthRetry).mockResolvedValue({
      data: { sha: "abc123" }
    } as never)

    expect(await make().fetchLatestSha("a.md")).toEqual({
      kind: "ok",
      sha: "abc123"
    })
  })

  it("returns sha=null when the path resolves to a directory (array response)", async () => {
    vi.mocked(runWithAuthRetry).mockResolvedValue({ data: [] } as never)

    expect(await make().fetchLatestSha("dir/")).toEqual({
      kind: "ok",
      sha: null
    })
  })

  it("returns sha=null when the data object has no sha field", async () => {
    vi.mocked(runWithAuthRetry).mockResolvedValue({
      data: { type: "submodule" }
    } as never)

    expect(await make().fetchLatestSha("path")).toEqual({
      kind: "ok",
      sha: null
    })
  })

  it("returns kind=unauthorized on 401", async () => {
    vi.mocked(runWithAuthRetry).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { status: 401 })
    )

    expect(await make().fetchLatestSha("path")).toEqual({
      kind: "unauthorized"
    })
  })

  it("returns kind=offline on non-401 errors (404, network, etc.)", async () => {
    vi.mocked(runWithAuthRetry).mockRejectedValue(
      Object.assign(new Error("Not found"), { status: 404 })
    )
    expect(await make().fetchLatestSha("path")).toEqual({ kind: "offline" })

    vi.mocked(runWithAuthRetry).mockRejectedValue(new Error("network"))
    expect(await make().fetchLatestSha("path")).toEqual({ kind: "offline" })
  })
})

describe("useGitHubContent.updateFile / createFile (putFile)", () => {
  const mockOctokitRequest = vi.fn()

  beforeEach(() => {
    mockOctokitRequest.mockReset()
    vi.mocked(getOctokit).mockResolvedValue({
      request: mockOctokitRequest
    } as never)
    vi.mocked(confirmMessage).mockReset()
    vi.mocked(errorMessage).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns the new sha and calls confirmMessage on success", async () => {
    mockOctokitRequest.mockResolvedValue({
      data: { content: { sha: "new-sha" } }
    })

    const result = await make().updateFile({
      content: "# hello",
      path: "a.md",
      sha: "old-sha"
    })

    expect(result).toEqual({ sha: "new-sha", conflict: false })
    expect(confirmMessage).toHaveBeenCalledWith("✅ Note saved")
  })

  it("flags conflict=true on 409 and 422 responses", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})

    for (const status of [409, 422]) {
      mockOctokitRequest.mockRejectedValueOnce(
        Object.assign(new Error("Conflict"), { status })
      )
      const result = await make().createFile({ content: "x", path: "a.md" })
      expect(result).toEqual({ sha: null, conflict: true })
    }
    expect(errorMessage).toHaveBeenCalledWith(
      "⚠ Conflict: this note changed on GitHub"
    )
  })

  it("returns conflict=false and calls errorMessage on non-conflict errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    mockOctokitRequest.mockRejectedValue(
      Object.assign(new Error("Server error"), { status: 500 })
    )

    const result = await make().updateFile({
      content: "x",
      path: "a.md",
      sha: "old"
    })

    expect(result).toEqual({ sha: null, conflict: false })
    expect(errorMessage).toHaveBeenCalledWith("❌ Note could not be saved")
  })
})

describe("useGitHubContent.uploadBinaryFile", () => {
  const mockOctokitRequest = vi.fn()

  beforeEach(() => {
    mockOctokitRequest.mockReset()
    vi.mocked(getOctokit).mockResolvedValue({
      request: mockOctokitRequest
    } as never)
    vi.mocked(errorMessage).mockReset()
    vi.mocked(confirmMessage).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uploads pre-base64-encoded content without re-encoding", async () => {
    mockOctokitRequest.mockResolvedValue({
      data: { content: { sha: "img-sha" } }
    })

    const result = await make().uploadBinaryFile({
      base64: "ZGF0YQ==",
      path: "img/cover.png"
    })

    expect(result).toEqual({ sha: "img-sha", conflict: false })
    expect(mockOctokitRequest).toHaveBeenCalledWith(
      "PUT /repos/{owner}/{repo}/contents/{+path}",
      expect.objectContaining({
        path: "img/cover.png",
        content: "ZGF0YQ=="
      })
    )
    expect(confirmMessage).toHaveBeenCalledWith("✅ Image uploaded")
  })

  it("surfaces a conflict on existing file (422)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    mockOctokitRequest.mockRejectedValue(
      Object.assign(new Error("Exists"), { status: 422 })
    )

    const result = await make().uploadBinaryFile({
      base64: "Zm9v",
      path: "img.png"
    })

    expect(result).toEqual({ sha: null, conflict: true })
    expect(errorMessage).toHaveBeenCalledWith(
      "⚠ A file already exists at this path on GitHub"
    )
  })
})

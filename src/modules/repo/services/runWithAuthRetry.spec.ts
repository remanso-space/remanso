import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/modules/user/service/signIn", () => ({
  getAccessToken: vi.fn(),
  refreshToken: vi.fn()
}))

import {
  getAccessToken,
  refreshToken
} from "@/modules/user/service/signIn"

import { runWithAuthRetry } from "./octo"

const unauthorized = () => Object.assign(new Error("Bad credentials"), { status: 401 })
const notFound = () => Object.assign(new Error("Not found"), { status: 404 })

describe("runWithAuthRetry", () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockResolvedValue({
      token: "t1"
    } as Awaited<ReturnType<typeof getAccessToken>>)
    vi.mocked(refreshToken).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns the call result on success without refreshing", async () => {
    const call = vi.fn().mockResolvedValue("ok")

    const result = await runWithAuthRetry(call)

    expect(result).toBe("ok")
    expect(call).toHaveBeenCalledTimes(1)
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it("rethrows non-401 errors immediately without refreshing", async () => {
    const err = notFound()
    const call = vi.fn().mockRejectedValue(err)

    await expect(runWithAuthRetry(call)).rejects.toBe(err)
    expect(refreshToken).not.toHaveBeenCalled()
    expect(call).toHaveBeenCalledTimes(1)
  })

  it("refreshes and retries once on 401, returning the retry result", async () => {
    vi.mocked(refreshToken).mockResolvedValue({
      token: "t2"
    } as Awaited<ReturnType<typeof refreshToken>>)

    const call = vi
      .fn()
      .mockRejectedValueOnce(unauthorized())
      .mockResolvedValueOnce("after-refresh")

    const result = await runWithAuthRetry(call)

    expect(result).toBe("after-refresh")
    expect(refreshToken).toHaveBeenCalledWith({ force: true })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it("rethrows the original 401 when refresh returns null", async () => {
    vi.mocked(refreshToken).mockResolvedValue(null)
    const err = unauthorized()
    const call = vi.fn().mockRejectedValue(err)

    await expect(runWithAuthRetry(call)).rejects.toBe(err)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it("rethrows the original 401 when refresh itself throws", async () => {
    vi.mocked(refreshToken).mockRejectedValue(new Error("network down"))
    const err = unauthorized()
    const call = vi.fn().mockRejectedValue(err)

    await expect(runWithAuthRetry(call)).rejects.toBe(err)
  })

  it("propagates a retry-time error after a successful refresh", async () => {
    vi.mocked(refreshToken).mockResolvedValue({
      token: "t2"
    } as Awaited<ReturnType<typeof refreshToken>>)

    const retryErr = unauthorized()
    const call = vi
      .fn()
      .mockRejectedValueOnce(unauthorized())
      .mockRejectedValueOnce(retryErr)

    await expect(runWithAuthRetry(call)).rejects.toBe(retryErr)
    expect(call).toHaveBeenCalledTimes(2)
  })
})

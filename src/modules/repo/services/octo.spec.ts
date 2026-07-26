import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/modules/user/service/signIn", () => ({
  getAccessToken: vi.fn().mockResolvedValue({ token: "test-token" })
}))

import { DEFAULT_OCTOKIT_TIMEOUT_MS, getOctokit } from "./octo"

const okResponse = () =>
  new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json" }
  })

describe("getOctokit timeout hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("injects an AbortSignal.timeout into requests by default", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
    let receivedSignal: AbortSignal | undefined
    const mockFetch = vi.fn(async (_url: string, init: RequestInit) => {
      receivedSignal = init.signal ?? undefined
      return okResponse()
    })

    const octokit = await getOctokit()
    await octokit.request("GET /user", {
      request: { fetch: mockFetch as unknown as typeof fetch }
    })

    expect(timeoutSpy).toHaveBeenCalledWith(DEFAULT_OCTOKIT_TIMEOUT_MS)
    expect(receivedSignal).toBeInstanceOf(AbortSignal)
  })

  it("respects a caller-provided signal and does not overwrite it", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
    const controller = new AbortController()
    let receivedSignal: AbortSignal | undefined
    const mockFetch = vi.fn(async (_url: string, init: RequestInit) => {
      receivedSignal = init.signal ?? undefined
      return okResponse()
    })

    const octokit = await getOctokit()
    await octokit.request("GET /user", {
      request: {
        fetch: mockFetch as unknown as typeof fetch,
        signal: controller.signal
      }
    })

    expect(timeoutSpy).not.toHaveBeenCalled()
    expect(receivedSignal).toBe(controller.signal)
  })
})

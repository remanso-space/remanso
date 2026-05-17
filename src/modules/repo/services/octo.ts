import { Octokit } from "@octokit/rest"

import { getAccessToken, refreshToken } from "@/modules/user/service/signIn"

export const DEFAULT_OCTOKIT_TIMEOUT_MS = 8_000

export const getOctokit = async (): Promise<Octokit> => {
  const response = await getAccessToken()

  const octokit = new Octokit({
    auth: response?.token ?? ""
  })

  octokit.hook.before("request", (options) => {
    options.request ??= {}
    if (!options.request.signal) {
      options.request.signal = AbortSignal.timeout(DEFAULT_OCTOKIT_TIMEOUT_MS)
    }
  })

  return octokit
}

const isUnauthorized = (error: unknown): boolean =>
  (error as { status?: number })?.status === 401

// Runs an Octokit call; on 401, force-refreshes the token and retries once.
// Rethrows the original error if the refresh fails or the retry still 401s.
export const runWithAuthRetry = async <T>(
  call: (octokit: Octokit) => Promise<T>
): Promise<T> => {
  try {
    return await call(await getOctokit())
  } catch (error) {
    if (!isUnauthorized(error)) throw error
    const refreshed = await refreshToken({ force: true }).catch(() => null)
    if (!refreshed) throw error
    return await call(await getOctokit())
  }
}

import { Octokit } from "@octokit/rest"

import { getAccessToken } from "@/modules/user/service/signIn"

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

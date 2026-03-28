import { Octokit } from "@octokit/rest"

import { getAccessToken } from "@/modules/user/service/signIn"

export const getOctokit = async (): Promise<Octokit> => {
  const response = await getAccessToken()

  return new Octokit({
    auth: response?.token ?? ""
  })
}

import { useAsyncState } from "@vueuse/core"

import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { RepoBase } from "@/modules/repo/interfaces/RepoBase"
import { getOctokit } from "@/modules/repo/services/octo"

export const useRepos = () => {
  const { username, accessToken } = useGitHubLogin()
  const repos = useAsyncState<RepoBase[]>(async () => {
    if (!accessToken.value || !username.value) {
      return []
    }

    const octokit = await getOctokit()

    const repoList = await octokit.request("GET /search/repositories", {
      q: `user:${username.value}`,
      per_page: 100
    })

    return repoList.data.items
      .map((item) => ({
        id: `${item.id}`,
        name: item.name,
        isPrivate: item.private
      }))
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  }, [])

  return {
    repos: repos.state,
    isReady: repos.isReady
  }
}

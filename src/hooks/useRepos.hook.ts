import { computed, ref } from "vue"

import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { RepoBase } from "@/modules/repo/interfaces/RepoBase"
import { getOctokit } from "@/modules/repo/services/octo"

const PER_PAGE = 30

export const useRepos = () => {
  const { username, accessToken } = useGitHubLogin()

  const repos = ref<RepoBase[]>([])
  const isReady = ref(false)
  const currentPage = ref(0)
  const totalCount = ref(0)

  const loadMore = async () => {
    if (!accessToken.value || !username.value) {
      isReady.value = true
      return
    }
    const octokit = await getOctokit()
    const nextPage = currentPage.value + 1
    const repoList = await octokit.request("GET /search/repositories", {
      q: `user:${username.value}`,
      per_page: PER_PAGE,
      page: nextPage
    })
    currentPage.value = nextPage
    totalCount.value = repoList.data.total_count
    const newItems = repoList.data.items.map((item) => ({
      id: `${item.id}`,
      name: item.name,
      isPrivate: item.private
    }))
    repos.value = [...repos.value, ...newItems].sort((a, b) =>
      a.name < b.name ? -1 : 1
    )
    isReady.value = true
  }

  const canLoadMore = computed(() => repos.value.length < totalCount.value)

  loadMore()

  return { repos, isReady, canLoadMore, loadMore }
}

import { computed, ref, watch } from "vue"

import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { RepoBase } from "@/modules/repo/interfaces/RepoBase"
import { getOctokit } from "@/modules/repo/services/octo"

const PER_PAGE = 30
const STALE_TIME_MS = 20 * 60 * 1000

const repos = ref<RepoBase[]>([])
const isReady = ref(false)
const isLoading = ref(false)
const hasCredentialError = ref(false)
const currentPage = ref(0)
const totalCount = ref(0)
let lastFetchedAt = 0

const { username, accessToken } = useGitHubLogin()

const resetState = () => {
  repos.value = []
  currentPage.value = 0
  totalCount.value = 0
  isReady.value = false
  isLoading.value = false
  hasCredentialError.value = false
  lastFetchedAt = 0
}

const loadMore = async () => {
  if (!accessToken.value || !username.value) {
    isReady.value = true
    return
  }
  if (isLoading.value) return
  isLoading.value = true
  try {
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
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status: number }).status === 401
    ) {
      hasCredentialError.value = true
    } else {
      throw err
    }
  } finally {
    isReady.value = true
    isLoading.value = false
  }
}

watch(accessToken, (next, prev) => {
  if (next === prev) return
  resetState()
  if (next && username.value) {
    lastFetchedAt = Date.now()
    loadMore()
  }
})

export const useRepos = () => {
  const canLoadMore = computed(
    () => !isLoading.value && repos.value.length < totalCount.value
  )

  const isStale = Date.now() - lastFetchedAt > STALE_TIME_MS
  if (!isReady.value || isStale) {
    if (isStale && isReady.value) {
      resetState()
    }
    lastFetchedAt = Date.now()
    loadMore()
  }

  return { repos, isReady, hasCredentialError, canLoadMore, loadMore }
}

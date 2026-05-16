import { computed } from "vue"

import { DataType } from "@/data/DataType.enum"
import { useRepos } from "@/hooks/useRepos.hook"
import { useFavoriteRepos } from "@/modules/repo/hooks/useFavoriteRepos.hook"
import { RepoBase } from "@/modules/repo/interfaces/RepoBase"

const FAVORITE_ID_PREFIX = `${DataType.FavoriteRepo}-`

export const useRepoList = () => {
  const { savedFavoriteRepos, addFavorite, removeFavorite } = useFavoriteRepos()
  const { repos, canLoadMore, loadMore } = useRepos()

  const favoriteRepos = computed<RepoBase[]>(() =>
    savedFavoriteRepos.value.map((fav) => ({
      id: fav._id?.startsWith(FAVORITE_ID_PREFIX)
        ? fav._id.slice(FAVORITE_ID_PREFIX.length)
        : (fav._id ?? ""),
      name: fav.name,
      isPrivate: fav.isPrivate
    }))
  )

  const favoriteCheckboxes = computed(() =>
    favoriteRepos.value.map((favorite) => favorite.id)
  )

  const otherRepos = computed(() => {
    const starredIds = new Set(favoriteCheckboxes.value)
    const starredNames = new Set(favoriteRepos.value.map((r) => r.name))
    return repos.value.filter(
      (repo) => !starredIds.has(repo.id) && !starredNames.has(repo.name)
    )
  })

  const toggleCheckbox = async (repo: RepoBase) => {
    if (favoriteCheckboxes.value.includes(repo.id)) {
      await removeFavorite(repo)
    } else {
      await addFavorite(repo)
    }
  }

  return {
    favoriteRepos,
    otherRepos,
    favoriteCheckboxes,
    toggleCheckbox,
    canLoadMore,
    loadMore
  }
}

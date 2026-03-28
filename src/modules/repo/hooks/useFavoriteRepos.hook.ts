import { computed, onMounted, ref } from "vue"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useRepos } from "@/hooks/useRepos.hook"
import { RepoBase } from "@/modules/repo/interfaces/RepoBase"
import { FavoriteRepo } from "@/modules/repo/models/FavoriteRepo"

export const useFavoriteRepos = () => {
  const { repos } = useRepos()
  const savedRepos = ref<FavoriteRepo[]>([])

  const getFavorites = async () => {
    savedRepos.value = await data.getAll<DataType.FavoriteRepo, FavoriteRepo>({
      prefix: DataType.FavoriteRepo,
      keys: repos.value.map((repo) => repo.id)
    })
  }

  const savedFavoriteRepos = computed(() =>
    savedRepos.value.filter((repo) => repo.isFavorite)
  )

  onMounted(() => {
    getFavorites()
  })

  const toggleFavorite = async (repo: RepoBase, isFavorite: boolean) => {
    const favorite: FavoriteRepo = {
      _id: data.generateId(DataType.FavoriteRepo, repo.id),
      $type: DataType.FavoriteRepo,
      isFavorite,
      name: repo.name,
      isPrivate: repo.isPrivate
    }

    await data.update(favorite)
    await getFavorites()
  }

  return {
    savedRepos,
    savedFavoriteRepos,
    addFavorite: (repo: RepoBase) => toggleFavorite(repo, true),
    removeFavorite: (repo: RepoBase) => toggleFavorite(repo, false)
  }
}

import { useAsyncState } from "@vueuse/core"
import { computed } from "vue"

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { History } from "@/data/models/History"

const HISTORY_ID = generateId(DataType.History, "history")

export const useLastVisitedRepos = () => {
  const history = useAsyncState(
    () =>
      data.get<DataType.History, History>(
        generateId(DataType.History, "history")
      ),
    null
  )

  const lastVisitedRepos = computed(() => history.state.value?.repos ?? [])

  const removeRepo = async (params: { user: string; repo: string }) => {
    const storedHistory = await data.get<DataType.History, History>(HISTORY_ID)
    if (!storedHistory) {
      return
    }

    const clearedRepo = storedHistory.repos.filter(
      (repo) => repo.user !== params.user && repo.repo !== params.repo
    )

    const newHistory: History = {
      ...storedHistory,
      repos: clearedRepo
    }
    await data.update(newHistory)
    history.execute()
  }

  return {
    lastVisitedRepos,
    removeRepo
  }
}

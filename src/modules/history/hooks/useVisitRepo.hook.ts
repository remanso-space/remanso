import { Ref, toValue } from "vue"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { History } from "@/data/models/History"

const HISTORY_ID = data.generateId(DataType.History, "history")
const MAX_REPO_HISTORY = 10

export const useVisitRepo = (newRepo: {
  user: Ref<string> | string
  repo: Ref<string> | string
}) => {
  const visitRepo = async () => {
    const history = await data.get<DataType.History, History>(HISTORY_ID)
    if (!history) {
      const newHistory: History = {
        _id: HISTORY_ID,
        $type: DataType.History,
        repos: [{ user: toValue(newRepo.user), repo: toValue(newRepo.repo) }]
      }
      await data.add<DataType.History>(newHistory)
      return
    }

    const clearedRepos = history.repos.filter(
      (repo) =>
        repo.user !== toValue(newRepo.user) &&
        repo.repo !== toValue(newRepo.repo)
    )

    const historyRepos = [
      { user: toValue(newRepo.user), repo: toValue(newRepo.repo) },
      ...clearedRepos
    ].slice(0, MAX_REPO_HISTORY - 1)

    const newHistory: History = {
      ...history,
      repos: historyRepos
    }

    await data.update(newHistory)
  }

  return {
    visitRepo
  }
}

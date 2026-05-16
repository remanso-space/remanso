import { Ref, ref } from "vue"

import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { prepareNoteCache } from "@/modules/note/cache/prepareNoteCache"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

export type FreshnessStatus =
  | "unknown"
  | "checking"
  | "verified"
  | "outdated"
  | "offline"

const MIN_SPINNER_MS = 400

export const useNoteFreshness = ({
  user,
  repo,
  sha,
  path,
  getEditedSha
}: {
  user: string
  repo: string
  sha: Ref<string>
  path: Ref<string | undefined>
  getEditedSha: () => Promise<string | null>
}) => {
  const store = useUserRepoStore()
  const { fetchLatestSha } = useGitHubContent({ user, repo })

  const status = ref<FreshnessStatus>("unknown")
  const lastCheckedAt = ref<Date | null>(null)
  const latestSha = ref<string | null>(null)

  const expectedSha = async () => (await getEditedSha()) ?? sha.value

  const check = async () => {
    if (!path.value) return
    status.value = "checking"
    const startedAt = performance.now()

    let next: FreshnessStatus
    const remoteSha = await fetchLatestSha(path.value)
    if (remoteSha === null) {
      next = "offline"
    } else {
      latestSha.value = remoteSha
      lastCheckedAt.value = new Date()
      const local = await expectedSha()
      next = remoteSha === local ? "verified" : "outdated"
    }

    const elapsed = performance.now() - startedAt
    if (elapsed < MIN_SPINNER_MS) {
      await new Promise((r) => setTimeout(r, MIN_SPINNER_MS - elapsed))
    }
    status.value = next
  }

  const pullLatest = async (): Promise<string | null> => {
    if (!path.value) return null
    const usedCachedSha = latestSha.value !== null
    const remoteSha = latestSha.value ?? (await fetchLatestSha(path.value))
    if (!remoteSha) {
      console.warn("pullLatest: could not resolve remote sha", { path: path.value })
      status.value = "offline"
      return null
    }
    const fileContent = await queryFileContent(user, repo, remoteSha)
    if (!fileContent) {
      console.warn("pullLatest: failed to fetch blob content", {
        path: path.value,
        remoteSha,
        usedCachedSha
      })
      // Cached SHA may be stale — clear so the next click re-resolves it.
      if (usedCachedSha) latestSha.value = null
      status.value = "offline"
      return null
    }
    const { saveCacheNote } = prepareNoteCache(sha.value, path.value)
    await saveCacheNote(fileContent, {
      editedSha: remoteSha,
      path: path.value
    })
    store.addFile({ path: path.value, sha: remoteSha })
    latestSha.value = remoteSha
    lastCheckedAt.value = new Date()
    status.value = "verified"
    const { getRawContent } = markdownBuilder(sha.value)
    return getRawContent(fileContent)
  }

  return {
    status,
    lastCheckedAt,
    latestSha,
    check,
    pullLatest
  }
}

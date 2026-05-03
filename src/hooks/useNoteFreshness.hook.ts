import { computed, Ref, ref } from "vue"

import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { prepareNoteCache } from "@/modules/note/cache/prepareNoteCache"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

export type FreshnessStatus =
  | "unknown"
  | "checking"
  | "verified"
  | "stale-known"
  | "outdated"
  | "offline"

const STALE_AFTER_MS = 2 * 60 * 1000

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

  const rawStatus = ref<FreshnessStatus>("unknown")
  const lastCheckedAt = ref<Date | null>(null)
  const latestSha = ref<string | null>(null)
  const tick = ref(0)
  let staleTimer: ReturnType<typeof setTimeout> | null = null

  const status = computed<FreshnessStatus>(() => {
    void tick.value
    if (rawStatus.value !== "verified") return rawStatus.value
    if (!lastCheckedAt.value) return rawStatus.value
    const age = Date.now() - lastCheckedAt.value.getTime()
    return age > STALE_AFTER_MS ? "stale-known" : "verified"
  })

  const armStaleTimer = () => {
    if (staleTimer) clearTimeout(staleTimer)
    staleTimer = setTimeout(() => {
      tick.value++
    }, STALE_AFTER_MS + 100)
  }

  const expectedSha = async () => (await getEditedSha()) ?? sha.value

  const check = async () => {
    if (!path.value) return
    rawStatus.value = "checking"
    const remoteSha = await fetchLatestSha(path.value)
    if (remoteSha === null) {
      rawStatus.value = "offline"
      return
    }
    latestSha.value = remoteSha
    lastCheckedAt.value = new Date()
    const local = await expectedSha()
    rawStatus.value = remoteSha === local ? "verified" : "outdated"
    armStaleTimer()
  }

  const pullLatest = async (): Promise<string | null> => {
    if (!path.value) return null
    const remoteSha = latestSha.value ?? (await fetchLatestSha(path.value))
    if (!remoteSha) {
      rawStatus.value = "offline"
      return null
    }
    const fileContent = await queryFileContent(user, repo, remoteSha)
    if (!fileContent) {
      rawStatus.value = "offline"
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
    rawStatus.value = "verified"
    armStaleTimer()
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

import { Ref, ref } from "vue"

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { prepareNoteCache } from "@/modules/note/cache/prepareNoteCache"
import { Note } from "@/modules/note/models/Note"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

export type FreshnessStatus =
  | "unknown"
  | "checking"
  | "verified"
  | "outdated"
  | "offline"
  | "unauthorized"

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
    const result = await fetchLatestSha(path.value)
    if (result.kind === "unauthorized") {
      next = "unauthorized"
    } else if (result.kind === "offline" || result.sha === null) {
      next = "offline"
    } else {
      latestSha.value = result.sha
      lastCheckedAt.value = new Date()
      const local = await expectedSha()
      next = result.sha === local ? "verified" : "outdated"
    }

    const elapsed = performance.now() - startedAt
    if (elapsed < MIN_SPINNER_MS) {
      await new Promise((r) => setTimeout(r, MIN_SPINNER_MS - elapsed))
    }
    status.value = next
  }

  const resolveRemoteSha = async (
    path: string
  ): Promise<{ sha: string | null; failureStatus: FreshnessStatus | null }> => {
    if (latestSha.value) return { sha: latestSha.value, failureStatus: null }
    const result = await fetchLatestSha(path)
    if (result.kind === "unauthorized") {
      return { sha: null, failureStatus: "unauthorized" }
    }
    if (result.kind === "offline" || result.sha === null) {
      return { sha: null, failureStatus: "offline" }
    }
    return { sha: result.sha, failureStatus: null }
  }

  const pullLatest = async (): Promise<{
    raw: string | null
    failureStatus: FreshnessStatus | null
  }> => {
    if (!path.value) return { raw: null, failureStatus: null }
    const usedCachedSha = latestSha.value !== null
    const { sha: remoteSha, failureStatus } = await resolveRemoteSha(path.value)
    if (!remoteSha) {
      console.warn("pullLatest: could not resolve remote sha", { path: path.value })
      if (failureStatus) status.value = failureStatus
      return { raw: null, failureStatus }
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
      return { raw: null, failureStatus: "offline" }
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
    return { raw: getRawContent(fileContent), failureStatus: null }
  }

  // The base blob (common ancestor) must come from its own immutable snapshot,
  // never from the path pointer — that holds the latest, which is "theirs".
  const getCachedBlob = async (blobSha: string): Promise<string | null> => {
    const note = await data.get<DataType.Note, Note>(
      generateId(DataType.Note, blobSha)
    )
    return note?.content ?? null
  }

  // Resolves the decoded raw text needed for a 3-way merge: `base` is the
  // version we edited from (the rejected sha), `theirs` is the current remote.
  // Returns null when any piece can't be resolved (offline, missing base).
  const resolveMergeSources = async (): Promise<{
    base: string
    theirs: string
    remoteSha: string
  } | null> => {
    if (!path.value) return null

    const { sha: remoteSha } = await resolveRemoteSha(path.value)
    if (!remoteSha) return null
    // Surface the resolved sha so a modal fallback's Overwrite can use it.
    latestSha.value = remoteSha
    const theirsBlob = await queryFileContent(user, repo, remoteSha)
    if (!theirsBlob) return null

    const baseSha = (await getEditedSha()) ?? sha.value
    const baseBlob =
      (await getCachedBlob(baseSha)) ??
      (await queryFileContent(user, repo, baseSha))
    if (!baseBlob) return null

    const { getRawContent } = markdownBuilder(sha.value)
    return {
      base: getRawContent(baseBlob),
      theirs: getRawContent(theirsBlob),
      remoteSha
    }
  }

  return {
    status,
    lastCheckedAt,
    latestSha,
    check,
    pullLatest,
    resolveMergeSources
  }
}

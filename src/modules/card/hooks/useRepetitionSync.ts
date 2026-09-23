import { onScopeDispose } from "vue"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { RepetitionCard } from "@/modules/card/models/RepetitionCard"
import {
  cardFromEntry,
  cardPathFromId,
  entryFromCard,
  mergeRepetitions,
  parseRepetitionFile,
  REPETITION_FILE_PATH,
  RepetitionEntries,
  sameEntry,
  serializeRepetitionFile
} from "@/modules/card/services/repetitionSync"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

const PUSH_DELAY_MS = 2_000

/**
 * Keeps the local review state and the repo's `.remanso.cards.json` in step.
 * Pull merges the two, push commits the result — so every device that can read
 * the repo starts a session where the last one left off.
 */
export const useRepetitionSync = () => {
  const store = useUserRepoStore()

  let remoteSha: string | undefined
  let pushTimer: ReturnType<typeof setTimeout> | undefined

  const github = () => useGitHubContent({ user: store.user, repo: store.repo })

  const readLocal = async () => {
    const docs = await data.getAll<DataType.RepetitionCard, RepetitionCard>({
      prefix: DataType.RepetitionCard
    })

    const byPath = new Map<string, RepetitionCard>()
    const entries: RepetitionEntries = {}

    for (const doc of docs) {
      const path = cardPathFromId(doc._id ?? "")
      if (!path) continue
      byPath.set(path, doc)
      entries[path] = entryFromCard(doc)
    }

    return { byPath, entries }
  }

  const fetchRemote = async (): Promise<RepetitionEntries | null> => {
    const file = await github().fetchFile(REPETITION_FILE_PATH)

    if (file.kind === "offline") return null
    if (file.kind === "missing") {
      remoteSha = undefined
      return {}
    }

    remoteSha = file.sha
    return parseRepetitionFile(file.content)
  }

  const writeRemote = async (entries: RepetitionEntries) => {
    const { updateFile, createFile } = github()
    const content = serializeRepetitionFile(entries)

    const result = remoteSha
      ? await updateFile({
          content,
          path: REPETITION_FILE_PATH,
          sha: remoteSha,
          silent: true
        })
      : await createFile({ content, path: REPETITION_FILE_PATH })

    if (result.sha) {
      remoteSha = result.sha
    }

    return result
  }

  /**
   * Pull, merge, write back whatever each side was missing. Returns false when
   * the remote is unreachable, so callers can keep working offline.
   */
  const sync = async (): Promise<boolean> => {
    if (!store.user || !store.repo) return false

    const remote = await fetchRemote()
    if (!remote) return false

    const { byPath, entries: local } = await readLocal()
    const merged = mergeRepetitions(local, remote)

    const updates = Object.entries(merged)
      .filter(([path, entry]) => !sameEntry(local[path], entry))
      .map(([path, entry]) => ({
        ...(byPath.get(path) ?? {}),
        ...cardFromEntry(path, entry)
      }))

    if (updates.length) {
      await data.bulkUpdate<DataType.RepetitionCard, RepetitionCard>(updates)
    }

    const remoteIsStale = Object.entries(merged).some(
      ([path, entry]) => !sameEntry(remote[path], entry)
    )

    if (remoteIsStale && store.canPush) {
      const { conflict } = await writeRemote(merged)
      // Someone else pushed between our read and our write: re-read and retry
      // once, which is enough for two devices answering minutes apart.
      if (conflict) {
        const fresh = await fetchRemote()
        if (fresh) await writeRemote(mergeRepetitions(merged, fresh))
      }
    }

    return true
  }

  /** Called after each answer; batches a burst of cards into one commit. */
  const pushSoon = () => {
    if (!store.canPush) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushTimer = undefined
      sync()
    }, PUSH_DELAY_MS)
  }

  const pushNow = async () => {
    clearTimeout(pushTimer)
    pushTimer = undefined
    await sync()
  }

  // Leaving the view mid-batch should still commit the answers already given.
  onScopeDispose(() => {
    if (pushTimer) pushNow()
  })

  return { sync, pushSoon, pushNow }
}

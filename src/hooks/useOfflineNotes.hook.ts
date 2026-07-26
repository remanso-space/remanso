import { useAsyncState } from "@vueuse/core"
import { computed, ref } from "vue"

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { buildNoteDocs } from "@/modules/note/cache/prepareNoteCache"
import { Note } from "@/modules/note/models/Note"
import { getMainReadme, queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

const CONCURRENCY = 8
const BULK_FLUSH_SIZE = 50

export type CacheFailureKind = "fetch" | "build" | "save" | "readme" | "unknown"

export type CacheFailure = {
  kind: CacheFailureKind
  path?: string
  sha?: string
  message?: string
  docIds?: string[]
}

const describeError = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return String(error)
}

const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) => {
  let cursor = 0
  const next = async (): Promise<void> => {
    const i = cursor++
    if (i >= items.length) return
    await worker(items[i])
    return next()
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next))
}

export const useOfflineNotes = () => {
  const store = useUserRepoStore()
  const totalOfNotes = computed(() => store.files.length)

  const noteCompleted = ref(0)
  const failures = ref<CacheFailure[]>([])
  const failedNotes = computed(() => failures.value.length)

  const recordFailure = (failure: CacheFailure) => {
    failures.value.push(failure)
    console.warn("[offline-cache] failure", failure)
  }

  const cacheAllNotes = async () => {
    const isInitialized = store.user && store.repo && totalOfNotes.value > 0

    if (!isInitialized) {
      return
    }

    const cachedNotesFromSha = await data.getAll<DataType.Note, Note>({
      prefix: DataType.Note,
      keys: store.files.map((file) => file.sha).filter(Boolean) as string[],
      includeDocs: false
    })

    const cachedNotesSet = new Set(cachedNotesFromSha.map((note) => note._id))

    const filesToFetch = store.files.filter(
      (file) =>
        file.sha && !cachedNotesSet.has(generateId(DataType.Note, file.sha))
    )

    noteCompleted.value = store.files.length - filesToFetch.length
    failures.value = []

    const pendingDocs: Note[] = []
    const flush = async () => {
      if (!pendingDocs.length) return
      const batch = pendingDocs.splice(0, pendingDocs.length)
      try {
        await data.bulkUpdate(batch)
      } catch (error) {
        recordFailure({
          kind: "save",
          message: describeError(error),
          docIds: batch
            .map((doc) => doc._id)
            .filter((id): id is string => Boolean(id))
        })
      }
    }

    const fetchWork = runWithConcurrency(
      filesToFetch,
      CONCURRENCY,
      async (file) => {
        try {
          const content = await queryFileContent(
            store.user,
            store.repo,
            file.sha!
          )
          if (content === null) {
            recordFailure({
              kind: "fetch",
              path: file.path,
              sha: file.sha!
            })
            return
          }
          let docs: Note[]
          try {
            docs = buildNoteDocs(file.sha!, file.path, content)
          } catch (error) {
            recordFailure({
              kind: "build",
              path: file.path,
              sha: file.sha!,
              message: describeError(error)
            })
            return
          }
          pendingDocs.push(...docs)
          if (pendingDocs.length >= BULK_FLUSH_SIZE) {
            await flush()
          }
        } catch (error) {
          recordFailure({
            kind: "unknown",
            path: file.path,
            sha: file.sha,
            message: describeError(error)
          })
        } finally {
          noteCompleted.value++
        }
      }
    )

    const readmeWork = getMainReadme(store.user, store.repo).catch((error) => {
      recordFailure({ kind: "readme", message: describeError(error) })
    })

    await Promise.all([fetchWork, readmeWork])
    await flush()
  }
  const { execute, isLoading } = useAsyncState(cacheAllNotes, null, {
    immediate: false
  })

  return {
    cacheAllNotes: execute,
    isLoading,
    totalOfNotes,
    noteCompleted,
    failedNotes,
    failures
  }
}

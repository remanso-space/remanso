import { useAsyncState } from "@vueuse/core"
import { computed, ref } from "vue"

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { prepareNoteCache } from "@/modules/note/cache/prepareNoteCache"
import { Note } from "@/modules/note/models/Note"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

export const useOfflineNotes = () => {
  const store = useUserRepoStore()
  const totalOfNotes = computed(() => store.files.length)

  const noteCompleted = ref(0)
  const failedNotes = ref(0)

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

    noteCompleted.value = 0
    failedNotes.value = 0

    for (const file of store.files) {
      noteCompleted.value++

      if (
        !file.sha ||
        cachedNotesSet.has(generateId(DataType.Note, file.sha))
      ) {
        continue
      }

      const { saveCacheNote } = prepareNoteCache(file.sha, file.path)

      const contentFile = await queryFileContent(
        store.user,
        store.repo,
        file.sha
      )

      if (!contentFile) {
        failedNotes.value++
        continue
      }

      saveCacheNote(contentFile)
    }
  }
  const { execute, isLoading } = useAsyncState(cacheAllNotes, null, {
    immediate: false
  })

  return {
    cacheAllNotes: execute,
    isLoading,
    totalOfNotes,
    noteCompleted,
    failedNotes
  }
}

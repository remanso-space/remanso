import { computed, onUnmounted } from "vue"

import { noteEventBus } from "@/bus/noteEventBus"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { resolvePath } from "@/modules/repo/services/resolvePath"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { pathToNotePathTitle } from "@/utils/noteTitle"
import { errorMessage } from "@/utils/notif"

export const useNoteView = () => {
  const store = useUserRepoStore()
  const { stackedNotes, addStackedNote } = useRouteQueryStackedNotes()

  const titles = computed(() =>
    stackedNotes.value?.reduce((obj: Record<string, string>, note) => {
      if (!note) {
        return obj
      }
      const filePath = store.files.find((file) => file.sha === note)?.path ?? ""

      obj[note] = pathToNotePathTitle(filePath)

      return obj
    }, {})
  )

  const unsubscribeLink = noteEventBus.addEventBusListener(
    ({ path, currentNoteSHA }) => {
      const currentFile = store.files.find(
        (file) => file.sha === currentNoteSHA
      )

      const absolutePath = resolvePath(currentFile?.path ?? "", path)

      const file = store.files.find((file) => file.path === absolutePath)
      if (!file?.sha) {
        errorMessage(`Note ${absolutePath} not found.`)
        return
      }

      addStackedNote(currentNoteSHA ?? "", file.sha)
    }
  )

  onUnmounted(() => {
    unsubscribeLink()
  })

  return {
    titles
  }
}

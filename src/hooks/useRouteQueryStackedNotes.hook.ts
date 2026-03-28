import { useWindowSize } from "@vueuse/core"
import { useRouteQuery } from "@vueuse/router"
import { nextTick, readonly } from "vue"

import { getBookmarkWidthPx } from "@/constants/bookmark-width"
import { getNoteWidth } from "@/constants/note-width"
import { useOverlay } from "@/hooks/useOverlay.hook"

export const useRouteQueryStackedNotes = () => {
  const stackedNotes = useRouteQuery("stackedNotes", undefined, {
    transform: (value: string | string[] | undefined) => {
      if (!value) {
        return []
      }

      return Array.isArray(value) ? value : [value]
    }
  })
  const { height } = useWindowSize()

  const { scrollToNote, isMobile } = useOverlay(false)

  const scrollToFocusedNote = (
    noteId: string | null = null,
    notes: string[] = stackedNotes.value
  ) => {
    nextTick(() => {
      const index = noteId ? notes.findIndex((nid) => nid === noteId) : 0

      if (isMobile.value) {
        if (noteId) {
          const cleanNoteId = noteId.replaceAll(":", "-")
          const element = document.querySelector(
            `.note-${cleanNoteId}`
          ) as HTMLElement

          const top = (index + 1) * (element?.clientHeight ?? height.value)
          scrollToNote(top)
        } else {
          scrollToNote(0)
        }
      } else {
        if (noteId) {
          const left = (index + 1) * (getNoteWidth() - getBookmarkWidthPx())
          scrollToNote(left)
        } else {
          scrollToNote(0)
        }
      }
    })
  }

  const addStackedNote = (
    currentSha: string,
    sha: string,
    selector?: string
  ) => {
    if (stackedNotes.value.includes(sha)) {
      scrollToFocusedNote(selector ?? sha)
      return
    }

    if (!currentSha) {
      stackedNotes.value = [sha]
    } else {
      const [splittedStackedNotes] = stackedNotes.value
        .join(";")
        .split(currentSha)

      const newStackedNotes = [
        ...splittedStackedNotes.replaceAll(";;", ";").split(";"),
        currentSha,
        sha
      ].filter((sha) => !!sha)

      stackedNotes.value = newStackedNotes
    }

    scrollToFocusedNote(selector ?? sha, stackedNotes.value)
  }

  return {
    stackedNotes: readonly(stackedNotes),
    addStackedNote,
    scrollToFocusedNote
  }
}

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

  const { scrollToNote, scrollToElement, isMobile } = useOverlay(false)

  const scrollToHashInNote = (
    cleanSha: string,
    hash: string,
    smooth: boolean,
    attempts = 30
  ) => {
    if (attempts <= 0) {
      return
    }

    const heading = document.querySelector(
      `.note-${cleanSha} #${CSS.escape(hash)}`
    )
    if (heading) {
      heading.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: smooth ? "smooth" : "auto"
      })
      return
    }

    requestAnimationFrame(() => {
      scrollToHashInNote(cleanSha, hash, smooth, attempts - 1)
    })
  }

  const scrollToNoteElement = (
    cleanNoteId: string,
    index: number,
    attempts = 30
  ) => {
    const element = document.querySelector(
      `.note-${cleanNoteId}`
    ) as HTMLElement | null

    if (element) {
      scrollToElement(element)
      return
    }

    if (attempts <= 0) {
      scrollToNote((index + 1) * height.value)
      return
    }

    requestAnimationFrame(() => {
      scrollToNoteElement(cleanNoteId, index, attempts - 1)
    })
  }

  type ScrollToFocusedNoteOptions = {
    noteId?: string | null
    notes?: string[]
    hash?: string
    smoothHash?: boolean
  }

  const scrollToFocusedNote = ({
    noteId = null,
    notes = stackedNotes.value,
    hash,
    smoothHash = false
  }: ScrollToFocusedNoteOptions = {}) => {
    nextTick(() => {
      const index = noteId ? notes.findIndex((nid) => nid === noteId) : 0

      if (isMobile.value) {
        if (noteId) {
          scrollToNoteElement(noteId.replaceAll(":", "-"), index)
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

      if (hash && noteId) {
        scrollToHashInNote(noteId.replaceAll(":", "-"), hash, smoothHash)
      }
    })
  }

  const addStackedNote = (
    currentSha: string,
    sha: string,
    selector?: string,
    hash?: string
  ) => {
    if (stackedNotes.value.includes(sha)) {
      scrollToFocusedNote({
        noteId: selector ?? sha,
        hash,
        smoothHash: true
      })
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

    scrollToFocusedNote({ noteId: selector ?? sha, hash })
  }

  return {
    stackedNotes: readonly(stackedNotes),
    addStackedNote,
    scrollToFocusedNote
  }
}

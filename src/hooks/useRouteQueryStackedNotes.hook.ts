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
    anchorTop?: number,
    attempts = 30
  ) => {
    const element = document.querySelector(
      `.note-${cleanNoteId}`
    ) as HTMLElement | null

    if (element) {
      scrollToElement(element, anchorTop)
      return
    }

    if (attempts <= 0) {
      scrollToNote((index + 1) * height.value)
      return
    }

    requestAnimationFrame(() => {
      scrollToNoteElement(cleanNoteId, index, anchorTop, attempts - 1)
    })
  }

  type ScrollToFocusedNoteOptions = {
    noteId?: string | null
    notes?: string[]
    hash?: string
    smoothHash?: boolean
    anchorTop?: number
  }

  const scrollToFocusedNote = ({
    noteId = null,
    notes = stackedNotes.value,
    hash,
    smoothHash = false,
    anchorTop
  }: ScrollToFocusedNoteOptions = {}) => {
    nextTick(() => {
      const index = noteId ? notes.findIndex((nid) => nid === noteId) : 0

      if (isMobile.value) {
        if (noteId) {
          scrollToNoteElement(noteId.replaceAll(":", "-"), index, anchorTop)
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
    const anchorTop =
      document.getElementById("main-app")?.scrollTop ?? undefined

    if (stackedNotes.value.includes(sha)) {
      scrollToFocusedNote({
        noteId: selector ?? sha,
        hash,
        smoothHash: true,
        anchorTop
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

    scrollToFocusedNote({ noteId: selector ?? sha, hash, anchorTop })
  }

  // Advance a note's handle in place when its content changes (edit / pull):
  // the live view follows to the new sha, while any previously-shared link
  // keeps pointing at the old, now-immutable snapshot.
  const replaceStackedNote = (oldSha: string, newSha: string) => {
    if (!oldSha || !newSha || oldSha === newSha) {
      return
    }
    if (!stackedNotes.value.includes(oldSha)) {
      return
    }
    stackedNotes.value = stackedNotes.value.map((note) =>
      note === oldSha ? newSha : note
    )
  }

  return {
    stackedNotes: readonly(stackedNotes),
    addStackedNote,
    replaceStackedNote,
    scrollToFocusedNote
  }
}

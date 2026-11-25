import { useWindowSize } from "@vueuse/core"
import { useRouteQuery } from "@vueuse/router"
import { nextTick, readonly, ref } from "vue"

import { getBookmarkWidthPx } from "@/constants/bookmark-width"
import { getNoteWidth } from "@/constants/note-width"
import { scrollBehavior, useOverlay } from "@/hooks/useOverlay.hook"

// The note the user just opened from a link: the only one that plays the
// entrance. Notes restored from the URL, or remounted on a new sha, appear as is.
const justAddedNote = ref<string | null>(null)

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
        behavior: scrollBehavior(!smooth)
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
    instant = false,
    attempts = 30
  ) => {
    const element = document.querySelector(
      `.note-${cleanNoteId}`
    ) as HTMLElement | null

    if (element) {
      scrollToElement(element, anchorTop, { instant })
      return
    }

    if (attempts <= 0) {
      scrollToNote((index + 1) * height.value, { instant })
      return
    }

    requestAnimationFrame(() => {
      scrollToNoteElement(cleanNoteId, index, anchorTop, instant, attempts - 1)
    })
  }

  type ScrollToFocusedNoteOptions = {
    noteId?: string | null
    notes?: string[]
    hash?: string
    smoothHash?: boolean
    anchorTop?: number
    instant?: boolean
  }

  const scrollToFocusedNote = ({
    noteId = null,
    notes = stackedNotes.value,
    hash,
    smoothHash = false,
    anchorTop,
    instant = false
  }: ScrollToFocusedNoteOptions = {}) => {
    nextTick(() => {
      const index = noteId ? notes.findIndex((nid) => nid === noteId) : 0

      if (isMobile.value) {
        if (noteId) {
          scrollToNoteElement(
            noteId.replaceAll(":", "-"),
            index,
            anchorTop,
            instant
          )
        } else {
          scrollToNote(0, { instant })
        }
      } else {
        if (noteId) {
          const left = (index + 1) * (getNoteWidth() - getBookmarkWidthPx())
          scrollToNote(left, { instant })
        } else {
          scrollToNote(0, { instant })
        }
      }

      if (hash && noteId) {
        scrollToHashInNote(noteId.replaceAll(":", "-"), hash, smoothHash)
      }
    })
  }

  // Focus the deepest note when opening a shared link with stacked notes,
  // instead of landing on the readme and forcing a manual scroll (especially
  // long on mobile where notes stack vertically).
  const scrollToLastStackedNote = () => {
    const lastNote = stackedNotes.value.at(-1)
    if (lastNote) {
      scrollToFocusedNote({ noteId: lastNote, instant: true })
    }
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
    justAddedNote.value = sha

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
    justAddedNote: readonly(justAddedNote),
    addStackedNote,
    replaceStackedNote,
    scrollToFocusedNote,
    scrollToLastStackedNote
  }
}

import { computed, onMounted, Ref, ref, toValue } from "vue"

import {
  BOOKMARK_WIDTH_REM,
  getBookmarkWidthPx
} from "@/constants/bookmark-width"
import { getNoteWidth } from "@/constants/note-width"
import { useOverlay } from "@/hooks/useOverlay.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"

export const useNoteOverlay = (
  className: string,
  index: Ref<number> | number
) => {
  const { x, y, isMobile } = useOverlay()
  const noteHeight = ref(0)

  const displayNoteOverlay = computed(() => {
    const valueIndex = toValue(index)

    if (isMobile.value) {
      return y.value > valueIndex * noteHeight.value
    } else {
      return (
        x.value >
        valueIndex * getNoteWidth() - valueIndex * getBookmarkWidthPx()
      )
    }
  })

  onMounted(() => {
    const { stackedNotes } = useRouteQueryStackedNotes()
    const noteElement = document.querySelector(
      `.${className}`
    ) satisfies HTMLElement | null

    if (!noteElement) {
      return
    }

    noteHeight.value = noteElement.clientHeight

    if (isMobile.value) {
      noteElement.style.top = `0`
    } else {
      noteElement.style.left = `${(toValue(index) + 1) * BOOKMARK_WIDTH_REM}rem`

      const stackedNoteContainers = document.querySelectorAll(
        ".stacked-note"
      ) satisfies NodeListOf<HTMLElement>

      stackedNoteContainers.forEach((stackedNote, ind) => {
        stackedNote.style.right = `calc(-${getNoteWidth()}px + ${
          (stackedNotes.value.length - ind) * BOOKMARK_WIDTH_REM
        }rem)`
      })
    }
  })

  return {
    displayNoteOverlay
  }
}

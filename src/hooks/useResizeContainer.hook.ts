import { onMounted, type Ref, watch } from "vue"

import { getNoteWidth } from "@/constants/note-width"
import { useOverlay } from "@/hooks/useOverlay.hook"

export const useResizeContainer = (
  containerClass: string,
  stackedNotes: Readonly<Ref<readonly string[]>>
) => {
  const { isMobile } = useOverlay(false)

  const resizeContainer = () => {
    const container = document.querySelector(
      `.${containerClass}`
    ) as HTMLElement | null

    if (!container) {
      return
    }

    if (isMobile.value) {
      container.style.height = `${(stackedNotes.value.length + 1) * 100}vh`
    } else {
      container.style.width = `${
        getNoteWidth() * (stackedNotes.value.length + 1)
      }px`
    }
  }

  onMounted(() => {
    resizeContainer()
  })

  watch(stackedNotes, resizeContainer, {
    immediate: true
  })
}

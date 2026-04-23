import { useEventListener, useWindowSize } from "@vueuse/core"
import { computed, ref } from "vue"

import { MOBILE_BREAKPOINT } from "@/constants/mobile"

export const useOverlay = (listen = true) => {
  const x = ref(0)
  const y = ref(0)
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value <= MOBILE_BREAKPOINT)

  if (listen) {
    const updateScroll = () => {
      const mainApp = document.getElementById("main-app")
      x.value = mainApp?.scrollLeft ?? 0
      y.value = mainApp?.scrollTop ?? 0
    }
    useEventListener(
      () => document.getElementById("main-app"),
      "scroll",
      updateScroll,
      { passive: true }
    )
  }

  const scrollToNote = (to: number) => {
    const go = () => {
      const mainApp = document.getElementById("main-app")
      if (!mainApp) return

      if (isMobile.value) {
        mainApp.scrollTo({ top: to, behavior: "smooth" })
      } else {
        mainApp.scrollTo({ left: to, behavior: "smooth" })
      }
    }

    setTimeout(() => {
      go()
    }, 80)
  }

  return {
    x,
    y,
    isMobile,
    scrollToNote
  }
}

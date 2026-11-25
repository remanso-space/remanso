import { useEventListener, useWindowSize } from "@vueuse/core"
import { computed, ref } from "vue"

import { MOBILE_BREAKPOINT } from "@/constants/mobile"

// Glide only on a jump the user asked for; restoring a position, or a user
// who asked for less motion, lands at once.
export const scrollBehavior = (instant = false): ScrollBehavior =>
  instant || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth"

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

  const scrollToNote = (to: number, { instant = false } = {}) => {
    const go = () => {
      const mainApp = document.getElementById("main-app")
      if (!mainApp) return

      const behavior = scrollBehavior(instant)
      if (isMobile.value) {
        mainApp.scrollTo({ top: to, behavior })
      } else {
        mainApp.scrollTo({ left: to, behavior })
      }
    }

    setTimeout(() => {
      go()
    }, 80)
  }

  const scrollToElement = (
    element: HTMLElement,
    anchorTop?: number,
    { instant = false } = {}
  ) => {
    const mainApp = document.getElementById("main-app")
    if (mainApp && anchorTop !== undefined) {
      mainApp.scrollTop = anchorTop
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: scrollBehavior(instant),
        block: "start"
      })
    })
  }

  return {
    x,
    y,
    isMobile,
    scrollToNote,
    scrollToElement
  }
}

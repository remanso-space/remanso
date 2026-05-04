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

  const scrollToElement = (element: HTMLElement) => {
    const mainApp = document.getElementById("main-app")
    const clickTop = (window as unknown as { __scrollAtClick?: number })
      .__scrollAtClick

    if (mainApp && clickTop !== undefined) {
      mainApp.scrollTop = clickTop
    }

    requestAnimationFrame(() => {
      const debug = document.getElementById("scroll-debug")
      if (debug && mainApp) {
        const er = element.getBoundingClientRect()
        const cr = mainApp.getBoundingClientRect()
        const lines = [
          `clickTop: ${clickTop ?? "n/a"}`,
          `before scrollTop: ${mainApp.scrollTop}`,
          `mainApp scrollH: ${mainApp.scrollHeight} clientH: ${mainApp.clientHeight}`,
          `body scrollY: ${window.scrollY} innerH: ${window.innerHeight}`,
          `el.rect.top: ${er.top.toFixed(1)}`,
          `mainApp.rect.top: ${cr.top.toFixed(1)}`,
          `target: ${(er.top - cr.top + mainApp.scrollTop).toFixed(1)}`
        ]
        debug.textContent = lines.join("\n")

        element.scrollIntoView({ behavior: "smooth", block: "start" })

        requestAnimationFrame(() => {
          debug.textContent += `\nafter1f scrollTop: ${mainApp.scrollTop}`
          setTimeout(() => {
            debug.textContent += `\nafter500ms scrollTop: ${mainApp.scrollTop}`
          }, 500)
        })
      } else {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
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

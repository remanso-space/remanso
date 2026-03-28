import { useEventListener, useWindowSize } from "@vueuse/core"
import { computed, ref } from "vue"

import { MOBILE_BREAKPOINT } from "@/constants/mobile"

export const useOverlay = (listen = true) => {
  const x = ref(0)
  const y = ref(0)
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value <= MOBILE_BREAKPOINT)

  if (listen) {
    // In Firefox/Chrome, body is the horizontal scroll container (body has
    // computed overflow-x: auto from overflow-y: hidden). In Safari, the
    // viewport (documentElement) is used instead. Listen on both.
    const updateScroll = () => {
      x.value = document.body.scrollLeft || window.scrollX
      y.value = document.body.scrollTop || window.scrollY
    }
    useEventListener(window, "scroll", updateScroll, {
      passive: true,
      capture: false
    })
    useEventListener(document.body, "scroll", updateScroll, {
      passive: true,
      capture: false
    })
  }

  const scrollToNote = (to: number) => {
    const go = () => {
      if (isMobile.value) {
        document.body.scrollTop = to
        document.documentElement.scrollTop = to
      } else {
        document.body.scrollLeft = to
        document.documentElement.scrollLeft = to
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

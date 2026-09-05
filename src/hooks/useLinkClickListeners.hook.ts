import { ComputedRef, onUnmounted, toValue } from "vue"

import { isExternalLink } from "@/utils/link"

/**
 * Wire a click handler onto every anchor rendered inside `.${className}`, and
 * flag the external ones so they can be styled. Rendered markdown replaces
 * those anchors wholesale, so callers re-run `listenToClick` after each render;
 * listeners are dropped first to avoid stacking them up, and again on unmount.
 */
export const useLinkClickListeners = (
  className: ComputedRef<string> | string,
  onLinkClick: EventListener
) => {
  const LINK_SELECTOR = `.${toValue(className)} a`

  const removeListeners = () => {
    const elements = document.querySelectorAll(LINK_SELECTOR)

    elements.forEach((element) => {
      element.removeEventListener("click", onLinkClick)
    })
  }

  const listenToClick = () => {
    removeListeners()
    const elements = document.querySelectorAll(LINK_SELECTOR)

    elements.forEach((element) => {
      const href = element.getAttribute("href")

      if (!href) {
        return
      }

      if (isExternalLink(href)) {
        element.classList.add("external-link")
      }
    })

    elements.forEach((element) => {
      element.addEventListener("click", onLinkClick)
    })
  }

  onUnmounted(() => {
    removeListeners()
  })

  return {
    listenToClick
  }
}

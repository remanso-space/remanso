import { ComputedRef, Ref, toValue } from "vue"

import { noteEventBus } from "@/bus/noteEventBus"
import { useLinkClickListeners } from "@/hooks/useLinkClickListeners.hook"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { isExternalLink } from "@/utils/link"

export const useLinks = (
  className: ComputedRef<string> | string,
  sha?: Ref<string> | string
) => {
  const store = useUserRepoStore()

  const linkNote: EventListener = (event) => {
    const anchor = (event.target as HTMLElement).closest("a")
    const href = anchor?.getAttribute("href")

    if (!href) {
      return
    }

    if (href.startsWith("#")) {
      event.preventDefault()
      const id = href.slice(1)
      const container = document.querySelector(`.${toValue(className)}`)
      const heading = container?.querySelector(`#${CSS.escape(id)}`)
      heading?.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "smooth"
      })
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (isExternalLink(href)) {
      window.open(href, "_blank")
      return
    }

    const hashIndex = href.indexOf("#")
    const path = hashIndex === -1 ? href : href.slice(0, hashIndex)
    const hash = hashIndex === -1 ? undefined : href.slice(hashIndex + 1)

    noteEventBus.emit({
      path,
      hash,
      currentNoteSHA: toValue(sha),
      user: store.user,
      repo: store.repo
    })
  }

  return useLinkClickListeners(className, linkNote)
}

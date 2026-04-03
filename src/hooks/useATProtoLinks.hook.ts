import { ComputedRef, onUnmounted, Ref, toValue } from "vue"

import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { parseAtUri } from "@/modules/atproto/parseAtUri"
import { toShortDid } from "@/modules/atproto/shortDid"
import { router } from "@/router/router"
import { isExternalLink } from "@/utils/link"

export const useATProtoLinks = (
  className: ComputedRef<string> | string,
  options: {
    currentAtUri?: Ref<string> | string | ComputedRef<string>
    mainNoteId: Ref<string> | string | ComputedRef<string>
  }
) => {
  const { addStackedNote, scrollToFocusedNote } = useRouteQueryStackedNotes()
  const { currentAtUri, mainNoteId } = options

  const linkNote = (event: Event) => {
    const target = event.target as HTMLElement
    const href = target.getAttribute("href")

    if (!href) {
      return
    }

    if (href.startsWith("#")) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (isExternalLink(href)) {
      window.open(href, "_blank")
      return
    }

    if (href.startsWith(window.location.origin)) {
      const { params } = router.resolve(
        href.replace(window.location.origin, "")
      )

      if (!params.shortDid || !params.rkey) {
        return
      }

      const noteId = params.slug
        ? `${params.shortDid}-${params.rkey}-${params.slug}`
        : `${params.shortDid}-${params.rkey}`

      if (noteId === toValue(mainNoteId)) {
        scrollToFocusedNote(null)
        return
      }

      addStackedNote(
        toValue(currentAtUri) ?? "",
        noteId,
        `${params.shortDid}-${params.rkey}`
      )
      return
    }

    if (href.startsWith("at://")) {
      const { did, rkey } = parseAtUri(href)
      const noteId = `${toShortDid(did)}-${rkey}`

      if (noteId === toValue(mainNoteId)) {
        scrollToFocusedNote(null)
        return
      }

      addStackedNote(toValue(currentAtUri) ?? "", noteId)
    }
  }

  const LINK_SELECTOR = `.${toValue(className)} a`

  const removeListeners = () => {
    const elements = document.querySelectorAll(LINK_SELECTOR)

    elements.forEach((element) => {
      element.removeEventListener("click", linkNote)
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
      element.addEventListener("click", linkNote)
    })
  }

  onUnmounted(() => {
    removeListeners()
  })

  return {
    listenToClick
  }
}

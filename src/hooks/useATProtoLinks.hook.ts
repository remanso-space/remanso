import { ComputedRef, Ref, toValue } from "vue"

import { useLinkClickListeners } from "@/hooks/useLinkClickListeners.hook"
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
    const anchor = (event.target as HTMLElement).closest("a")
    const href = anchor?.getAttribute("href")

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
        scrollToFocusedNote()
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
        scrollToFocusedNote()
        return
      }

      addStackedNote(toValue(currentAtUri) ?? "", noteId)
    }
  }

  return useLinkClickListeners(className, linkNote)
}

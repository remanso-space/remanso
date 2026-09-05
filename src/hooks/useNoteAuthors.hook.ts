import { computedAsync } from "@vueuse/core"
import { Ref } from "vue"

import { Author, getAuthors } from "@/modules/atproto/getAuthor"
import { PublicNoteListItem } from "@/modules/note/models/Note"

/**
 * Resolve the handle behind every DID in a note list. The list grows as pages
 * load, so this re-resolves the whole set rather than the new page alone —
 * getAuthors caches, so the notes already on screen cost nothing.
 */
export const useNoteAuthors = (notes: Ref<PublicNoteListItem[]>) => {
  const authors = computedAsync<Map<string, Author>>(async () => {
    if (notes.value.length === 0) {
      return new Map()
    }

    return getAuthors(new Set(notes.value.map((n) => n.did)))
  }, new Map())

  const getAuthor = (did: string) =>
    authors.value.has(did) ? authors.value.get(did)!.handle : ""

  return { authors, getAuthor }
}

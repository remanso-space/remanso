import { Author, getAuthors } from "@/modules/atproto/getAuthor"
import { PublicNoteListItem } from "@/modules/note/models/Note"
import { computedAsync } from "@vueuse/core"
import { computed, ref, Ref } from "vue"

interface UsePublicNoteListOptions {
  did?: Ref<string | undefined>
}

export function usePublicNoteList(options?: UsePublicNoteListOptions) {
  const isLoading = ref(false)
  const notes = ref<PublicNoteListItem[]>([])
  const cursor = ref<string | null | undefined>(null)
  const canLoadMore = computed(() => cursor.value !== undefined)

  const onLoadMore = async () => {
    if (isLoading.value) return
    isLoading.value = true

    const path = options?.did?.value ? `/${options.did.value}/notes` : "/notes"
    const noteAPI = new URL(path, "https://api.remanso.space")

    if (cursor.value) {
      noteAPI.searchParams.set("cursor", cursor.value)
    }

    const response = await fetch(noteAPI)
    const data: { notes: PublicNoteListItem[]; cursor: string | undefined } =
      await response.json()

    notes.value.push(...data.notes)
    cursor.value = data.cursor
    isLoading.value = false
  }

  const authors = computedAsync<Map<string, Author>>(async () => {
    if (notes.value.length === 0) {
      return new Map()
    }

    return getAuthors(new Set(notes.value.map((n) => n.did)))
  }, new Map())

  const getAuthor = (did: string) =>
    authors.value.has(did) ? authors.value.get(did)!.handle : ""

  return {
    notes,
    isLoading,
    canLoadMore,
    onLoadMore,
    authors,
    getAuthor,
  }
}

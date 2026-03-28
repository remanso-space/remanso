import { computedAsync } from "@vueuse/core"
import { computed, Ref, ref, watch } from "vue"

import { Author, getAuthors } from "@/modules/atproto/getAuthor"
import { PublicNoteListItem } from "@/modules/note/models/Note"

export function useFollowingNoteList(
  dids: Ref<Set<string>>,
  enabled: Ref<boolean>
) {
  const isLoading = ref(false)
  const notes = ref<PublicNoteListItem[]>([])
  const cursor = ref<string | null | undefined>(null)
  const canLoadMore = computed(
    () => dids.value.size > 0 && cursor.value !== undefined
  )

  const onLoadMore = async () => {
    if (isLoading.value) return
    if (dids.value.size === 0) return

    isLoading.value = true

    const body: { dids: string[]; limit: number; cursor?: string } = {
      dids: [...dids.value],
      limit: 20
    }

    if (cursor.value) {
      body.cursor = cursor.value
    }

    const response = await fetch("https://api.remanso.space/notes/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    const data: { notes: PublicNoteListItem[]; cursor?: string } =
      await response.json()

    notes.value.push(...data.notes)
    cursor.value = data.cursor
    isLoading.value = false
  }

  watch(dids, (newDids) => {
    if (!enabled.value) return
    if (newDids.size > 0 && notes.value.length === 0) {
      onLoadMore()
    }
  })

  watch(enabled, (isEnabled) => {
    if (isEnabled && dids.value.size > 0 && notes.value.length === 0) {
      onLoadMore()
    }
  })

  const authors = computedAsync<Map<string, Author>>(async () => {
    if (notes.value.length === 0) return new Map()
    return getAuthors(new Set(notes.value.map((n) => n.did)))
  }, new Map())

  const getAuthor = (did: string) =>
    authors.value.has(did) ? authors.value.get(did)!.handle : ""

  return { notes, isLoading, canLoadMore, onLoadMore, getAuthor }
}

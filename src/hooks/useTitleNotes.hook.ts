import { useTitle } from "@vueuse/core"
import { computed, Ref, toValue, watch } from "vue"

import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { useNotes } from "@/modules/note/hooks/useNotes"
import { pathToNoteTitle } from "@/utils/noteTitle"

export const generateTitle = (titles: string[]) => titles.join(" | ")

export const useTitleNotes = (prefix: Ref<string> | string) => {
  const { stackedNotes } = useRouteQueryStackedNotes()
  const { notes } = useNotes()
  const titleNotes = computed(() =>
    notes.value
      .filter((note) => stackedNotes.value.includes(note.sha ?? ""))
      .map((note) => pathToNoteTitle(note.path ?? ""))
  )

  const title = useTitle(generateTitle([toValue(prefix), ...titleNotes.value]))

  watch(titleNotes, () => {
    title.value = generateTitle([toValue(prefix), ...titleNotes.value])
  })
}

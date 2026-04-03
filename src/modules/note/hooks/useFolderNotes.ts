import { computed } from "vue"

import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

export const useFolderNotes = (folders: string[]) => {
  const store = useUserRepoStore()

  const filteredNotes = computed(() =>
    store.files.filter(
      (file) =>
        folders.some((folder) => file.path?.startsWith(folder)) &&
        file.path?.endsWith(".md")
    )
  )

  const content = computed(() =>
    filteredNotes.value?.length > 0
      ? filteredNotes.value
          .map((note) => {
            const firstFolder = note.path?.split("/").shift()

            return `- [${note.path?.replace(`${firstFolder}/`, "")}](${
              note.path
            })`
          })
          .join("\n")
      : ""
  )

  return {
    content
  }
}

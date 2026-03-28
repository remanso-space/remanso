import { computed } from "vue"

import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

export const useNotes = () => {
  const store = useUserRepoStore()

  const notes = computed(() =>
    store.files.filter((file) => file.path?.endsWith(".md"))
  )

  return {
    notes
  }
}

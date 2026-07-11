import { watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { resolveLivePathsToShas } from "@/modules/note/liveNotes"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

// A living link (`?liveNotes=path&liveNotes=path`) carries file paths instead of
// pinned blob shas. On open we resolve each path to the latest sha against the
// HEAD file list and rewrite the URL to the ordinary pinned `stackedNotes` form
// — so the recipient lands on the current version, and from there everything
// (freshness, editing, the snapshot banner) behaves exactly as a shared snapshot
// would. The rewrite is a `replace`, so no history entry and no view transition.
export const useResolveLiveNotes = (onResolved?: () => void) => {
  const route = useRoute()
  const router = useRouter()
  const store = useUserRepoStore()

  let resolved = false

  const tryResolve = () => {
    if (resolved) return

    const raw = route.query.liveNotes
    if (!raw) {
      resolved = true
      return
    }

    // Wait for the HEAD file list before resolving paths to shas.
    if (store.files.length === 0) return
    resolved = true

    const entries = (Array.isArray(raw) ? raw : [raw]).filter(
      (entry): entry is string => typeof entry === "string"
    )
    const shas = resolveLivePathsToShas(entries, store.files)

    const query = { ...route.query }
    delete query.liveNotes
    if (shas.length) {
      query.stackedNotes = shas
    } else {
      delete query.stackedNotes
    }

    router.replace({ path: route.path, query }).then(() => onResolved?.())
  }

  watch(() => store.files.length, tryResolve, { immediate: true })
}

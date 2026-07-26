<script lang="ts" setup>
import { computed } from "vue"
import { LocationQueryRaw, useRoute, useRouter } from "vue-router"

import {
  LEGACY_LIVE_NOTES_PARAM,
  LIVE_NOTES_PARAM,
  stackToLiveQuery
} from "@/modules/note/liveNotes"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { confirmMessage, errorMessage } from "@/utils/notif"

const route = useRoute()
const router = useRouter()
const store = useUserRepoStore()

const stackedShas = computed<string[]>(() => {
  const raw = route.query.stackedNotes
  if (!raw) return []
  return (Array.isArray(raw) ? raw : [raw]).filter(
    (sha): sha is string => typeof sha === "string"
  )
})

const hasStack = computed(() => stackedShas.value.length > 0)

const absoluteUrl = (query: LocationQueryRaw): string => {
  const { href } = router.resolve({ path: route.path, query })
  return `${window.location.origin}${href}`
}

// The exact snapshot: the current URL, with each note pinned to its blob sha.
const snapshotUrl = (): string => absoluteUrl({ ...route.query })

// The living link: the same notes referenced by path, so the recipient always
// lands on the latest version. See useResolveLiveNotes for the read side.
const livingUrl = (): string => {
  const query = { ...route.query }
  delete query.stackedNotes
  delete query[LEGACY_LIVE_NOTES_PARAM]
  return absoluteUrl({
    ...query,
    [LIVE_NOTES_PARAM]: stackToLiveQuery(stackedShas.value, store.files)
  })
}

const close = () =>
  (document.getElementById("share_modal") as HTMLDialogElement | null)?.close()

const copy = async (url: string, label: string) => {
  close()
  try {
    await navigator.clipboard.writeText(url)
    confirmMessage(`🔗 ${label} link copied`)
  } catch {
    errorMessage("❌ Couldn't copy the link")
  }
}
</script>

<template>
  <button
    class="btn btn-ghost btn-circle share-trigger"
    title="Share this view"
    aria-label="Share this view"
    onclick="share_modal.showModal()"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-share"
      width="30"
      height="30"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <line x1="8.7" y1="10.7" x2="15.3" y2="7.3" />
      <line x1="8.7" y1="13.3" x2="15.3" y2="16.7" />
    </svg>
  </button>

  <dialog id="share_modal" class="modal">
    <div class="modal-box max-w-md">
      <h3 class="text-lg font-bold">Share this view</h3>

      <button
        type="button"
        class="share-option"
        @click="copy(snapshotUrl(), 'Snapshot')"
      >
        <span class="share-option-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-pin"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4" />
            <path d="M9 15l-4.5 4.5" />
            <path d="M14.5 4l5.5 5.5" />
          </svg>
        </span>
        <span class="share-option-text">
          <span class="share-option-title">This exact version</span>
          <span class="share-option-desc">
            Pinned to what you see now — it never changes.
          </span>
        </span>
      </button>

      <button
        v-if="hasStack"
        type="button"
        class="share-option"
        @click="copy(livingUrl(), 'Always-latest')"
      >
        <span class="share-option-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-repeat"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3" />
            <path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3" />
          </svg>
        </span>
        <span class="share-option-text">
          <span class="share-option-title">Always latest</span>
          <span class="share-option-desc">
            Follows these notes, so the reader always sees the current version.
          </span>
        </span>
      </button>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<style scoped lang="scss">
.share-trigger {
  color: var(--link-accent);
}

.share-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  text-align: left;
  border: 1px solid var(--color-base-300);
  border-radius: var(--radius-box, 0.5rem);
  background-color: var(--color-base-100);
  color: var(--color-base-content);
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary);
  }
}

.share-option-icon {
  flex-shrink: 0;
  color: var(--link-accent);
}

.share-option-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.share-option-title {
  font-weight: 600;
}

.share-option-desc {
  font-size: 0.85em;
  opacity: 0.75;
}
</style>

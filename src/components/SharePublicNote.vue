<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router"

import { copyLink } from "@/utils/copyLink"

const route = useRoute()
const router = useRouter()

// A public note lives at its ATProto rkey, which always resolves to the record's
// current version — there is no blob sha to pin, so the snapshot/always-latest
// choice a repo note offers has nothing to choose between here. One click copies
// the link, stacked notes and all.
const share = () => {
  const { href } = router.resolve({
    name: "PublicNoteView",
    params: route.params,
    query: route.query
  })
  return copyLink(`${window.location.origin}${href}`, "Note")
}
</script>

<template>
  <button
    class="btn btn-ghost btn-circle share-trigger"
    title="Copy a link to this note"
    aria-label="Copy a link to this note"
    @click="share"
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
</template>

<style scoped lang="scss">
.share-trigger {
  color: var(--link-accent);
}
</style>

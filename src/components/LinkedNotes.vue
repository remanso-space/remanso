<script lang="ts" setup>
import { computed } from "vue"

import { useBacklinks } from "@/hooks/useBacklinks.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"

const props = defineProps<{
  sha: string
}>()

const shaProp = computed(() => props.sha)

const { backlink } = useBacklinks(shaProp)
const { addStackedNote } = useRouteQueryStackedNotes()
const hasBacklinks = computed(() => (backlink.value?.links.length ?? 0) > 0)

const emitNote = (sha: string) => {
  addStackedNote(props.sha, sha)
}
</script>

<template>
  <div v-if="hasBacklinks" class="linked-notes">
    <h5 class="subtitle is-5">🔗</h5>
    <ul class="links">
      <li v-for="link in backlink?.links" :key="link.sha">
        <button class="link" @click="emitNote(link.sha)">
          {{ link.title }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.linked-notes {
  padding: 1rem;
  background-color: var(--color-base-100);
  color: var(--color-base-content);

  .subtitle {
    font-style: italic;
    padding-top: 1rem;
    text-align: center;
  }

  ul {
    list-style-type: square;
  }
}
</style>

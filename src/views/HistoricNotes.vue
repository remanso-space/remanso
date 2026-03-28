<script lang="ts" setup>
import { defineAsyncComponent, ref } from "vue"

import { useNotes } from "@/modules/note/hooks/useNotes"

const devMode = ref(import.meta.env.DEV)
const FluxNote = defineAsyncComponent(() => import("@/components/FluxNote.vue"))

defineProps<{ user: string; repo: string }>()

const { notes } = useNotes()
</script>

<template>
  <div class="historic-notes">
    <flux-note
      key="historic-notes"
      :user="user"
      :repo="repo"
      :with-content="false"
    >
      <h3 class="subtitle is-3">History</h3>
      There are {{ notes.length }} notes

      <ul>
        <li v-for="note in notes" :key="note.sha ?? ''">
          {{ note.path }}
          <pre v-if="devMode">{{ note.sha }} | {{ note.size }}B</pre>
        </li>
      </ul>
    </flux-note>
  </div>
</template>

<style scoped lang="scss">
.historic-notes {
  display: flex;
  flex: 1;

  .subtitle {
    text-align: center;
  }
}
</style>

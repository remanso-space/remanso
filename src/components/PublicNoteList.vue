<script setup lang="ts">
import { vInfiniteScroll } from "@vueuse/components"

import { toShortDid } from "@/modules/atproto/shortDid"
import { PublicNoteListItem } from "@/modules/note/models/Note"
import { slugify } from "@/utils/slugify"

defineProps<{
  notes: PublicNoteListItem[]
  canLoadMore: boolean
  onLoadMore: () => Promise<void>
}>()

defineSlots<{
  meta(props: { note: PublicNoteListItem }): unknown
}>()
</script>

<template>
  <ul
    class="list rounded-box shadow-sm"
    v-infinite-scroll="[onLoadMore, { canLoadMore: () => canLoadMore }]"
  >
    <li v-for="note in notes" class="list-row">
      <div class="list-col">
        <router-link
          :to="{
            name: 'PublicNoteView',
            params: {
              shortDid: toShortDid(note.did),
              rkey: note.rkey,
              slug: slugify(note.title)
            }
          }"
          class="btn btn-link"
          >{{ note.title }}</router-link
        >
        <div class="text-xs opacity-80 alias">
          <slot name="meta" :note="note" />
        </div>
      </div>
    </li>
  </ul>
</template>

<style scoped lang="scss">
ul {
  width: 100%;
  max-width: 42rem;
  margin-inline: auto;
}

li {
  display: flex;

  .list-col {
    flex: 1;
  }

  a {
    padding: 0;
    min-height: 0;
    height: auto;
    text-align: left;
    font-size: 1.2rem;
    line-height: 1.5rem;
  }

  .alias {
    text-align: left;
    display: flex;
    justify-content: flex-start;
    margin-top: 0.125rem;
  }
}
</style>

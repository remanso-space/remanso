<script setup lang="ts">
import HomeButton from "@/components/HomeButton.vue"
import PublicNoteList from "@/components/PublicNoteList.vue"
import SkeletonLoader from "@/components/SkeletonLoader.vue"
import { usePublicNoteList } from "@/hooks/usePublicNoteList.hook"
import { getAuthor } from "@/modules/atproto/getAuthor"
import { fromShortDid } from "@/modules/atproto/shortDid"
import { computedAsync } from "@vueuse/core"
import { computed } from "vue"

const props = defineProps<{ shortDid: string }>()
const did = computed(() => fromShortDid(props.shortDid))

const { notes, isLoading, canLoadMore, onLoadMore } = usePublicNoteList({ did })

const author = computedAsync(async () => getAuthor(did.value))
</script>

<template>
  <main class="public-note-list-view">
    <div class="header">
      <home-button class="back-button" />
      <h1 v-if="author">{{ author.handle }}</h1>
      <div v-else class="skeleton h-8 w-40"></div>
    </div>
    <skeleton-loader v-if="isLoading" />
    <div v-else>
      <PublicNoteList
        :notes="notes"
        :can-load-more="canLoadMore"
        :on-load-more="onLoadMore"
      >
        <template #meta="{ note }">
          <span v-if="note.publishedAt">
            {{ new Date(note.publishedAt).toLocaleDateString() }}
          </span>
        </template>
      </PublicNoteList>
    </div>
  </main>
</template>

<style scoped lang="scss">
.public-note-list-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding-left: 1rem;
  padding-right: 1rem;

  .header {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    flex: 1;
    text-align: center;
    margin-bottom: 0;
  }

  .back-button {
    position: absolute;
  }

  @media screen and (min-width: 769px) {
    overflow-y: auto;
  }
}
</style>

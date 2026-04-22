<script lang="ts" setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  toRefs,
  watch
} from "vue"

import HeaderNote from "@/components/HeaderNote.vue"
import SkeletonLoader from "@/components/SkeletonLoader.vue"
import StackedNote from "@/components/StackedNote.vue"
import { useLinks } from "@/hooks/useLinks.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { useNoteView } from "@/hooks/useNoteView.hook"
import { useResizeContainer } from "@/hooks/useResizeContainer.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { useVisitRepo } from "@/modules/history/hooks/useVisitRepo.hook"
import CacheAllNotes from "@/modules/note/components/CacheAllNote.vue"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { useUserSettings } from "@/modules/user/hooks/useUserSettings.hook"

const props = withDefaults(
  defineProps<{
    user: string
    repo: string
    content?: string | null
    parseContent?: boolean
    withContent?: boolean
    withHeader?: boolean
  }>(),
  {
    content: null,
    parseContent: true,
    withContent: true,
    withHeader: true
  }
)

const user = computed(() => props.user)
const repo = computed(() => props.repo)

const refProps = toRefs(props)
const store = useUserRepoStore()
useUserSettings()
const { visitRepo } = useVisitRepo({ user: user, repo: repo })
const { toHTML } = markdownBuilder(repo)
const { listenToClick } = useLinks("note-display")
const { stackedNotes, scrollToFocusedNote } = useRouteQueryStackedNotes()

const { titles } = useNoteView()
useResizeContainer("note-container", stackedNotes)

const renderedContent = computed(() =>
  props.content !== null
    ? props.parseContent
      ? toHTML(props.content)
      : props.content
    : store.readme
)

const isLoading = computed(() => renderedContent.value === undefined)
const hasContent = computed(() => !!renderedContent.value)

watch(
  renderedContent,
  async () => {
    await nextTick()
    listenToClick()
  },
  { immediate: true }
)

watch(
  [refProps.user, refProps.repo],
  () => {
    store.setUserRepo(props.user, props.repo)
  },
  { immediate: true }
)

onMounted(() => visitRepo())

onUnmounted(() => {
  store.resetFiles()
})
</script>

<template>
  <main class="flux-note repo-note content note-container">
    <div class="note readme">
      <header-note v-if="withHeader" class="header" :user="user" :repo="repo" />
      <div class="repo-title-breadcrumb">
        <a
          class="title-stacked-note-link"
          @click.prevent="scrollToFocusedNote()"
          >{{ repo }}</a
        >
      </div>
      <div class="repo-title">
        <div class="repo-header">
          <h1 class="heading-1">
            {{ repo }}
          </h1>
          {{ user }}
        </div>
        <cache-all-notes />
      </div>
      <slot />
      <skeleton-loader v-if="isLoading || !hasContent" />
      <p
        v-else-if="withContent"
        class="note-display"
        v-html="renderedContent"
      />
    </div>
    <stacked-note
      v-for="(stackedNote, index) in stackedNotes"
      :key="stackedNote"
      class="note"
      :index="index"
      :sha="stackedNote"
      :user="user"
      :repo="repo"
      :title="titles[stackedNote]"
    />
  </main>
</template>

<style lang="scss">
$header-height: 40px;

.flux-note {
  display: flex;
  flex: 1;

  &.content {
    .title,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    strong {
      color: var(--color-base-content);
    }

    table {
      color: var(--color-base-content);
      background-color: var(--color-base-100);

      thead {
        th {
          color: var(--color-base-content);
        }
      }
    }

    blockquote {
      background-color: var(--color-base-100);
      color: var(--color-base-content);
    }
  }

  .header {
    height: $header-height;
  }

  .readme {
    position: sticky;
    left: 0;
    top: 0;
    padding: 0 2rem;
    scrollbar-width: none;

    .repo-title {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;

      .title {
        margin-bottom: 0;
      }

      .title,
      .subtitle {
        text-align: center;
      }

      img {
        vertical-align: middle;
      }
    }
  }

  .note-display {
    padding-bottom: 2rem;
  }

  .note {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    height: 100%;
    position: sticky;

    &:not(:first-child) {
      border-top: 1px solid rgba(18, 19, 58, 0.2);
    }

    .title {
      text-align: left;
    }
  }

  @media screen and (min-width: 769px) {
    .repo-title-breadcrumb {
      padding: 0.5rem 1rem 0;
      transform-origin: 0 0;
      transform: rotate(90deg);
      font-size: 0.8em;

      a {
        color: var(--color-base-content);
        display: block;
        text-align: center;
      }
    }

    .note {
      min-width: var(--note-width);
      max-width: var(--note-width);
    }
  }
}

@media print, screen and (max-width: 768px) {
  .flux-note {
    .readme {
      padding: 0 0.75rem;
    }
  }

  .flux-note {
    flex-wrap: wrap;
  }

  .note {
    width: 100vw;
    overflow-y: visible;
  }

  .repo-title-breadcrumb {
    display: none;
    visibility: hidden;
  }
}
</style>

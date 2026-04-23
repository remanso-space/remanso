<script lang="ts" setup>
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  watch
} from "vue"

import { useEditionMode } from "@/hooks/useEditionMode"
import { useFile } from "@/hooks/useFile.hook"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { useImages } from "@/hooks/useImages.hook"
import { useLinks } from "@/hooks/useLinks.hook"
import { runMermaid, useShikiji } from "@/hooks/useMarkdown.hook"
import { useNoteOverlay } from "@/hooks/useNoteOverlay.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { useTitleNotes } from "@/hooks/useTitleNotes.hook"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { encodeUTF8ToBase64 } from "@/utils/decodeBase64ToUTF8"
import { filenameToNoteTitle } from "@/utils/noteTitle"

const LinkedNotes = defineAsyncComponent(
  () => import("@/components/LinkedNotes.vue")
)

const EditNote = defineAsyncComponent(
  () => import("@/modules/note/components/EditNote.vue")
)

const props = defineProps<{
  user: string
  repo: string
  index: number
  title?: string
  sha: string
}>()

const user = computed(() => props.user)
const repo = computed(() => props.repo)
const sha = computed(() => props.sha)
const index = computed(() => props.index)

const { scrollToFocusedNote } = useRouteQueryStackedNotes()

const {
  path,
  content,
  rawContent,
  getRawContent,
  saveCacheNote,
  getEditedSha
} = useFile(sha)
const initialRawContent = ref<string | null>(null)
const className = computed(() => `stacked-note-${props.index}`)
const { listenToClick } = useLinks(className.value, sha)
const titleClassName = computed(() => `title-${className.value}`)
useTitleNotes(repo)

const store = useUserRepoStore()
const hasBacklinks = computed(() => store.userSettings?.backlink)

const { displayNoteOverlay } = useNoteOverlay(className.value, index)
const displayedTitle = computed(() => filenameToNoteTitle(props.title ?? ""))
const breadcrumbs = computed(() => displayedTitle.value.split(" / "))

const { updateFile } = useGitHubContent({
  user: user.value,
  repo: repo.value
})

onMounted(async () => {
  initialRawContent.value = await getRawContent()
})

const { mode, toggleMode } = useEditionMode()

watch([content, mode], () => {
  if (!content.value) {
    return
  }

  nextTick(() => {
    listenToClick()

    if (/\!\[.*?\]\(.*?\)/.test(rawContent.value)) {
      useImages(props.sha)
    }

    if (rawContent.value.includes("```mermaid")) {
      runMermaid(`.note-${sha.value} .mermaid`)
    }

    if (rawContent.value.includes("```")) {
      useShikiji()
    }
  })
})

watch(mode, async (newMode) => {
  const hasUserFinishedToEdit =
    newMode === "read" && rawContent.value !== initialRawContent.value

  if (!hasUserFinishedToEdit) {
    return
  }
  if (!path.value) {
    console.warn("no path found for this file")

    return
  }

  const editedSha = (await getEditedSha()) ?? sha.value
  const newSha = await updateFile({
    content: rawContent.value,
    path: path.value,
    sha: editedSha
  })

  if (!newSha) {
    console.warn("no new SHA found for this file")

    return
  }

  await saveCacheNote(encodeUTF8ToBase64(rawContent.value), {
    editedSha: newSha
  })
  initialRawContent.value = rawContent.value
})
</script>

<template>
  <div
    class="stacked-note"
    :class="{
      [className]: true,
      overlay: displayNoteOverlay,
      [`note-${sha}`]: true
    }"
  >
    <a
      class="title-stacked-note-link"
      @click.prevent="scrollToFocusedNote(props.sha)"
    >
      <div
        class="title-stacked-note breadcrumbs text-sm"
        :class="titleClassName"
      >
        <ul>
          <li v-for="(part, i) in breadcrumbs" :key="i">
            {{ part }}
          </li>
        </ul>
      </div>
    </a>
    <section class="text-content">
      <button
        class="action button is-text is-light"
        :class="{ 'is-link': mode === 'edit' }"
        :style="mode === 'edit' ? 'color: var(--color-primary)' : ''"
        @click="toggleMode"
      >
        <svg
          v-if="mode === 'read'"
          xmlns="http://www.w3.org/2000/svg"
          class="icon icon-tabler icon-tabler-edit"
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
          <path
            d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"
          />
          <path
            d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"
          />
          <path d="M16 5l3 3" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="icon icon-tabler icon-tabler-device-floppy"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path
            d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2"
          />
          <path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
          <path d="M14 4l0 4l-6 0l0 -4" />
        </svg>
      </button>
      <div v-if="mode === 'edit'" class="edit">
        <edit-note v-model="rawContent" />
      </div>
      <div v-if="mode === 'read'" class="note-content" v-html="content"></div>
    </section>
    <linked-notes v-if="hasBacklinks && content" :sha="sha" />
  </div>
</template>

<style lang="scss" scoped>
$border-color: rgba(18, 19, 58, 0.2);

.stacked-note {
  padding: 0 1.5rem 1rem;
  background-color: var(--color-base-100);
  color: var(--color-base-content);
  scrollbar-width: none;

  &.overlay {
    box-shadow: -3px 0 0.4em $border-color;
  }

  section {
    padding: 0 0.5rem 2rem;
  }
}

.offline-ready {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.title-stacked-note {
  background-color: var(--color-base-100);
  color: var(--color-base-content);
  font-size: 0.8em;
  overflow: hidden;

  ul,
  li {
    margin-top: 0;
    margin-bottom: 0;
    padding-left: 0;
    text-decoration: none;
  }
}

.text-content {
  flex: 1;
  scrollbar-width: none;

  div {
    height: 100%;
  }
}

.action {
  float: right;
  margin: 0.2rem;

  img {
    vertical-align: bottom;
  }
}

@media screen and (max-width: 768px) {
  .stacked-note {
    padding: 0 0.75rem 1rem;

    section {
      padding: 1rem 0 2rem;
      overflow-x: auto;
      overflow-y: clip;
    }

    .note-content {
      padding: 0;
      scrollbar-width: none;
    }
  }
}

@media screen and (min-width: 769px) {
  .stacked-note {
    border-top: 0;
    border-left: 1px solid $border-color;
  }

  .title-stacked-note {
    padding: 0 1rem;
    transform-origin: 0 0;
    transform: rotate(90deg);
  }

  a {
    white-space: nowrap;
  }
}

@media print {
  .stacked-note {
    break-after: always;

    &.overlay {
      box-shadow: none;
    }
  }
}
</style>

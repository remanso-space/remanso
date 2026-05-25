<script lang="ts" setup>
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  watch
} from "vue"

import { useEditionMode } from "@/hooks/useEditionMode"
import { useFile } from "@/hooks/useFile.hook"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { useImageUpload } from "@/hooks/useImageUpload.hook"
import { useLinks } from "@/hooks/useLinks.hook"
import { renderCodeFile } from "@/hooks/useMarkdown.hook"
import { useMarkdownPostRender } from "@/hooks/useMarkdownPostRender.hook"
import { useNoteFreshness } from "@/hooks/useNoteFreshness.hook"
import { useNoteOverlay } from "@/hooks/useNoteOverlay.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { useTitleNotes } from "@/hooks/useTitleNotes.hook"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { encodeUTF8ToBase64 } from "@/utils/decodeBase64ToUTF8"
import { getFileLanguage, isMarkdownPath } from "@/utils/fileLanguage"
import { filenameToNoteTitle } from "@/utils/noteTitle"
import { errorMessage } from "@/utils/notif"

const LinkedNotes = defineAsyncComponent(
  () => import("@/components/LinkedNotes.vue")
)

const NoteFreshnessBadge = defineAsyncComponent(
  () => import("@/components/NoteFreshnessBadge.vue")
)

const NoteConflictModal = defineAsyncComponent(
  () => import("@/components/NoteConflictModal.vue")
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
const isMarkdown = computed(() =>
  path.value ? isMarkdownPath(path.value) : true
)
const displayedContent = ref("")

watch(
  [rawContent, isMarkdown, path],
  async ([raw, isMd, p]) => {
    if (!raw) {
      displayedContent.value = ""
      return
    }
    if (isMd) {
      displayedContent.value = content.value
      return
    }
    const lang = p ? getFileLanguage(p) : null
    const filename = p?.split("/").pop()
    const result = await renderCodeFile({ rawContent: raw, lang, filename })
    if (rawContent.value === raw) {
      displayedContent.value = result
    }
  },
  { immediate: true }
)

watch(content, (c) => {
  if (isMarkdown.value) displayedContent.value = c
})
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

const { uploadImage } = useImageUpload({
  user: user.value,
  repo: repo.value,
  notePath: path
})

const fileInput = ref<HTMLInputElement | null>(null)
const editKey = ref(0)
const isUploading = ref(false)

const onImagePicked = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file || !path.value) return
  isUploading.value = true
  try {
    const result = await uploadImage(file)
    if (!result) return
    const trimmed = rawContent.value.replace(/\n+$/, "")
    const prefix = trimmed ? `${trimmed}\n\n` : ""
    rawContent.value = `${prefix}![](${result.filename})\n`
    editKey.value++
  } finally {
    isUploading.value = false
  }
}

const {
  status: freshnessStatus,
  lastCheckedAt,
  latestSha,
  check: checkFreshness,
  pullLatest
} = useNoteFreshness({
  user: user.value,
  repo: repo.value,
  sha,
  path,
  getEditedSha
})

const conflictOpen = ref(false)

onMounted(async () => {
  initialRawContent.value = await getRawContent()
})

watch(
  path,
  (p) => {
    if (p) void checkFreshness()
  },
  { immediate: true }
)

const { mode, toggleMode } = useEditionMode()

useMarkdownPostRender(content, () => `.note-${sha.value}`, {
  onReady: () => listenToClick(),
  tikz: true,
  mermaid: () => rawContent.value.includes("```mermaid"),
  shikiji: () => isMarkdown.value && rawContent.value.includes("```"),
  images: () =>
    /\!\[.*?\]\(.*?\)/.test(rawContent.value) ? props.sha : null,
  triggers: [mode]
})

const performSave = async (overrideSha?: string) => {
  if (!path.value) {
    console.warn("no path found for this file")
    return
  }

  const editedSha = overrideSha ?? (await getEditedSha()) ?? sha.value
  const { sha: newSha, conflict } = await updateFile({
    content: rawContent.value,
    path: path.value,
    sha: editedSha
  })

  if (conflict) {
    await checkFreshness()
    conflictOpen.value = true
    if (mode.value === "read") toggleMode()
    return
  }

  if (!newSha) {
    console.warn("no new SHA found for this file")
    return
  }

  await saveCacheNote(encodeUTF8ToBase64(rawContent.value), {
    editedSha: newSha
  })
  initialRawContent.value = rawContent.value
}

watch(mode, async (newMode) => {
  if (newMode === "edit") {
    void checkFreshness()
    return
  }

  const hasUserFinishedToEdit =
    newMode === "read" && rawContent.value !== initialRawContent.value

  if (!hasUserFinishedToEdit) {
    return
  }
  if (!path.value) {
    console.warn("no path found for this file")
    return
  }

  await checkFreshness()
  if (freshnessStatus.value === "outdated") {
    conflictOpen.value = true
    return
  }

  await performSave()
})

const onConflictDiscard = async () => {
  const newRaw = await pullLatest()
  if (newRaw !== null) {
    rawContent.value = newRaw
    initialRawContent.value = newRaw
  }
}

const onConflictOverwrite = async () => {
  if (latestSha.value) {
    await performSave(latestSha.value)
  }
}

const onConflictCancel = () => {
  if (mode.value === "read") toggleMode()
}

const onBadgeClick = async () => {
  try {
    if (freshnessStatus.value !== "outdated") {
      await checkFreshness()
      if (freshnessStatus.value === "unauthorized") {
        errorMessage("🔐 GitHub auth expired — please sign in again")
      }
      return
    }

    const hasUnsavedEdits = rawContent.value !== initialRawContent.value
    if (hasUnsavedEdits) {
      conflictOpen.value = true
      return
    }

    const newRaw = await pullLatest()
    if (newRaw !== null) {
      rawContent.value = newRaw
      initialRawContent.value = newRaw
      return
    }
    if (freshnessStatus.value === "unauthorized") {
      errorMessage("🔐 GitHub auth expired — please sign in again")
    }
  } catch (error) {
    console.error("freshness badge click failed", error)
    errorMessage("❌ Couldn't pull latest from GitHub")
  }
}
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
    <div class="title-stacked-note breadcrumbs text-sm" :class="titleClassName">
      <div class="action-bar">
        <note-freshness-badge
          :status="freshnessStatus"
          :last-checked-at="lastCheckedAt"
          @click="onBadgeClick"
          class="action"
        />
        <button
          v-if="isMarkdown && mode === 'edit'"
          class="action button is-text is-light"
          :title="isUploading ? 'Uploading…' : 'Upload image'"
          :disabled="isUploading"
          @click="fileInput?.click()"
        >
          <span
            v-if="isUploading"
            class="loading loading-spinner loading-sm"
          ></span>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-photo-plus"
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
            <path d="M15 8h.01" />
            <path
              d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5"
            />
            <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l4 4" />
            <path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l2 2" />
            <path d="M16 19h6" />
            <path d="M19 16v6" />
          </svg>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="onImagePicked"
        />
        <button
          v-if="isMarkdown"
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
      </div>
      <a
        class="title-stacked-note-link"
        @click.prevent="scrollToFocusedNote({ noteId: props.sha })"
      >
        <ul>
          <li v-for="(part, i) in breadcrumbs" :key="i">
            {{ part }}
          </li>
        </ul>
      </a>
    </div>
    <section class="text-content">
      <div v-if="mode === 'edit' && isMarkdown" class="edit">
        <edit-note :key="editKey" v-model="rawContent" />
      </div>
      <div
        v-if="mode === 'read'"
        class="note-content"
        v-html="displayedContent"
      ></div>
    </section>
    <linked-notes v-if="hasBacklinks && content" :sha="sha" />
    <note-conflict-modal
      v-model:open="conflictOpen"
      @discard="onConflictDiscard"
      @overwrite="onConflictOverwrite"
      @cancel="onConflictCancel"
    />
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
    padding: 0 0.5rem;
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

  > .edit,
  > .note-content {
    height: 100%;
  }
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}

.hidden-input {
  display: none;
}

.action {
  margin: 0;

  &:hover {
    cursor: pointer;
  }

  img {
    vertical-align: bottom;
  }
}

@media screen and (max-width: 768px) {
  .stacked-note {
    padding: 0 0.75rem 1rem;
    height: 100svh;

    section {
      padding: 1rem 0;
      overflow-x: auto;
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
    position: sticky;
    top: 0;
  }

  .title-stacked-note {
    padding: 0;
    transform-origin: 0 0;
    transform: rotate(90deg);
  }

  a {
    white-space: nowrap;
  }

  .action-bar {
    .action {
      transform: rotate(-90deg);
    }
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

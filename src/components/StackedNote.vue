<script lang="ts" setup>
import { useDebounceFn } from "@vueuse/core"
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
  watch
} from "vue"

import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useAudioUpload } from "@/hooks/useAudioUpload.hook"
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
import { RECORDING_COLLECTION } from "@/modules/atproto/recording.types"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { encodeUTF8ToBase64 } from "@/utils/decodeBase64ToUTF8"
import { getFileLanguage, isMarkdownPath } from "@/utils/fileLanguage"
import { insertBlockAt } from "@/utils/insertBlockAt"
import {
  findCheckboxIndex,
  setCheckboxInMarkdown
} from "@/utils/markdownCheckbox"
import { noteRkeyFromFrontmatter } from "@/utils/noteRkeyFromFrontmatter"
import { filenameToNoteTitle } from "@/utils/noteTitle"
import { noteTitleForAlt } from "@/utils/noteTitleForAlt"
import { confirmMessage, errorMessage } from "@/utils/notif"
import { threeWayMerge } from "@/utils/threeWayMerge"
import { extractYouTubeId, fetchYouTubeMeta } from "@/utils/youtube"

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

const NoteState = defineAsyncComponent(
  () => import("@/components/NoteState.vue")
)

const AudioRecorderModal = defineAsyncComponent(
  () => import("@/components/AudioRecorderModal.vue")
)

const NoteEditToolbar = defineAsyncComponent(
  () => import("@/components/NoteEditToolbar.vue")
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

const { scrollToFocusedNote, replaceStackedNote } = useRouteQueryStackedNotes()

// When this note's content changes (edit / pull) its sha changes too; advance
// the stack handle so the live view follows it, leaving the old sha as an
// immutable snapshot for any link already shared.
const advanceStackTo = (newSha: string | null) => {
  if (newSha) replaceStackedNote(sha.value, newSha)
}

const {
  path,
  newerSha,
  content,
  rawContent,
  getRawContent,
  saveCacheNote,
  getEditedSha
} = useFile(sha)

// When this is an older snapshot of a still-existing note, jump the stack to
// its current version (the exact snapshot is never swapped underneath you).
const viewLatest = () => advanceStackTo(newerSha.value)
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
const canPush = computed(() => store.canPush)

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

const editKey = ref(0)
const isUploading = ref(false)

// Last caret position the editor reported, captured on blur. Null when the
// editor never had focus, in which case the block is appended.
const caretOffset = ref<number | null>(null)

const insertAtCaret = (block: string) => {
  rawContent.value = insertBlockAt(rawContent.value, caretOffset.value, block)
  // The editor remounts on editKey, which drops the selection, so the stored
  // offset is stale from here on.
  caretOffset.value = null
  editKey.value++
}

const onImagePicked = async (file: File) => {
  if (!path.value) return
  isUploading.value = true
  try {
    const result = await uploadImage(file)
    if (!result) return
    insertAtCaret(`![](${result.filename})`)
  } finally {
    isUploading.value = false
  }
}

// Read the URL from the clipboard rather than a prompt: pasting a link is how
// people carry a YouTube video over, and it mirrors the fleeting-note flow.
const onYoutube = async () => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    errorMessage("Clipboard access is not available.")
    return
  }

  let clipboardText: string
  try {
    clipboardText = (await navigator.clipboard.readText()).trim()
  } catch (err) {
    console.warn(err)
    errorMessage("Unable to read from the clipboard.")
    return
  }

  const videoId = extractYouTubeId(clipboardText)
  if (!videoId) {
    errorMessage("The clipboard does not contain a valid YouTube link or id.")
    return
  }

  const meta = await fetchYouTubeMeta(videoId)
  const caption = meta
    ? [meta.title, meta.author].filter(Boolean).join(" · ")
    : ""

  insertAtCaret(
    caption
      ? `@[youtube](${videoId})\n\n- ${caption}`
      : `@[youtube](${videoId})`
  )
}

const { did: atprotoDid, isLoggedIn: isATProtoLoggedIn } = useATProtoLogin()

// PDS blobs are served without auth and the recording record is broadcast on
// the firehose, so audio attached to a private note would be public anyway.
// Keeping the button on *.pub.md notes removes the trap instead of warning
// about it.
const isPublishedNote = computed(() => !!path.value?.endsWith(".pub.md"))
const canAttachAudio = computed(
  () => isPublishedNote.value && isATProtoLoggedIn.value
)

// Pass a getter, not a value: the ATProto session restores asynchronously
// after mount, so a DID read here would still be empty at click time.
const { attachAudio } = useAudioUpload({
  did: () => atprotoDid.value ?? undefined,
  notePath: path,
  noteContent: rawContent
})

const recorderOpen = ref(false)

// A published note takes its recording by rkey, so there is no line to insert
// and the file stays exactly as it was — which is silent feedback unless we
// say so. A note that has never been published has no rkey to share and still
// gets the markdown embed at the caret.
const onAudioAttached = (markdown: string | null) => {
  if (markdown) return insertAtCaret(markdown)
  confirmMessage("Recording attached to this note")
}

const onAudioPicked = async (file: File) => {
  if (!path.value) return
  isUploading.value = true
  try {
    const result = await attachAudio(file)
    if (!result) return
    onAudioAttached(result.markdown)
  } finally {
    isUploading.value = false
  }
}

// A MediaRecorder take has no duration in its container header, so the
// recorder's elapsed count is passed through rather than probed back off the
// blob, which would report Infinity.
const onRecordingAttached = async ({
  file,
  durationSec
}: {
  file: File
  durationSec: number
}) => {
  if (!path.value) return
  isUploading.value = true
  try {
    const result = await attachAudio(file, {
      durationSec,
      source: "recording"
    })
    if (!result) return
    onAudioAttached(result.markdown)
    recorderOpen.value = false
  } finally {
    isUploading.value = false
  }
}

const {
  status: freshnessStatus,
  lastCheckedAt,
  latestSha,
  check: checkFreshness,
  pullLatest,
  resolveMergeSources
} = useNoteFreshness({
  user: user.value,
  repo: repo.value,
  sha,
  path,
  getEditedSha
})

const conflictOpen = ref(false)
const loadStatus = ref<"loading" | "ready" | "failed">("loading")

const loadNote = async () => {
  loadStatus.value = "loading"
  const raw = await getRawContent()
  if (raw === null) {
    loadStatus.value = "failed"
    return
  }
  rawContent.value = raw
  initialRawContent.value = raw
  loadStatus.value = "ready"
}

onMounted(loadNote)

// A note only has a trustworthy baseline once it has finished loading. While
// it is still loading (or after a failed load) rawContent holds the empty
// placeholder and initialRawContent is null, so a naive
// `rawContent !== initialRawContent` check reads as a huge edit — and saving
// that would clobber the real file on GitHub with an empty commit. Gate every
// "is this dirty?" decision on a loaded baseline.
const isDirty = computed(
  () =>
    loadStatus.value === "ready" &&
    initialRawContent.value !== null &&
    rawContent.value !== initialRawContent.value
)

watch(
  path,
  (p) => {
    if (p) void checkFreshness()
  },
  { immediate: true }
)

const { mode, toggleMode } = useEditionMode()

/**
 * The recording attached to this note, if the file has been published and the
 * note is not already carrying the same at-uri inline — in which case
 * markdown-it-recording places a player of its own and this one would be the
 * second copy of the same audio.
 *
 * Read mode only: in edit mode the pane is a textarea, and there is no
 * rendered title to sit under.
 */
const attachedRecording = computed(() => {
  const noteRkey = noteRkeyFromFrontmatter(rawContent.value)
  const authorDid = atprotoDid.value
  if (!noteRkey || !authorDid || mode.value !== "read") return null

  const atUri = `at://${authorDid}/${RECORDING_COLLECTION}/${noteRkey}`
  if (rawContent.value.includes(atUri)) return null

  return { atUri, alt: noteTitleForAlt(rawContent.value, path.value ?? "") }
})

useMarkdownPostRender(content, () => `.note-${sha.value}`, {
  onReady: () => listenToClick(),
  noteRecording: () => attachedRecording.value,
  tikz: true,
  macroplan: true,
  mermaid: () => rawContent.value.includes("```mermaid"),
  shikiji: () => isMarkdown.value && rawContent.value.includes("```"),
  images: () => (/\!\[.*?\]\(.*?\)/.test(rawContent.value) ? props.sha : null),
  triggers: [mode]
})

const performSave = async (overrideSha?: string) => {
  if (!path.value) {
    console.warn("no path found for this file")
    return
  }

  // Defence in depth: never push content we didn't successfully load, or we'd
  // overwrite the file on GitHub with the empty placeholder.
  if (loadStatus.value !== "ready" || initialRawContent.value === null) {
    console.warn("refusing to save a note that hasn't finished loading")
    return
  }

  const editedSha = overrideSha ?? (await getEditedSha()) ?? sha.value
  const { sha: newSha, conflict } = await updateFile({
    content: rawContent.value,
    path: path.value,
    sha: editedSha
  })

  if (conflict) {
    await handleConflict()
    return
  }

  if (!newSha) {
    console.warn("no new SHA found for this file")
    return
  }

  await saveCacheNote(encodeUTF8ToBase64(rawContent.value), {
    editedSha: newSha,
    path: path.value
  })
  initialRawContent.value = rawContent.value
  advanceStackTo(newSha)
}

// On a save/freshness conflict, try a 3-way merge first: if our edits and the
// remote ones don't overlap, commit the merge silently (just a toast) so the
// user is never interrupted. Only genuinely overlapping edits open the modal.
const handleConflict = async () => {
  if (!path.value) return

  const sources = await resolveMergeSources()
  if (sources) {
    const { clean, merged } = threeWayMerge(
      sources.base,
      rawContent.value,
      sources.theirs
    )
    if (clean) {
      const { sha: newSha, conflict } = await updateFile({
        content: merged,
        path: path.value,
        sha: sources.remoteSha,
        successMessage: "✅ Merged remote changes & saved"
      })
      if (!conflict && newSha) {
        rawContent.value = merged
        await saveCacheNote(encodeUTF8ToBase64(merged), {
          editedSha: newSha,
          path: path.value
        })
        initialRawContent.value = merged
        advanceStackTo(newSha)
        return
      }
      // Remote moved again between fetch and commit — fall back to the modal.
    }
  }

  // Overlapping edits, or merge sources unavailable — let the user decide.
  // Ensure latestSha is set so the modal's "overwrite" has a target.
  if (!latestSha.value) await checkFreshness()
  conflictOpen.value = true
  if (mode.value === "read") toggleMode()
}

// Ticking a checkbox in read mode rewrites the markdown source in place and
// commits it, so a note used as a todo list stays usable without entering
// edit mode. Toggles are debounced into a single commit.
const CHECKBOX_COMMIT_DEBOUNCE_MS = 1000

const hasPendingCheckboxToggle = ref(false)

const canToggleCheckbox = computed(
  () => canPush.value && isMarkdown.value && loadStatus.value === "ready"
)

const saveCheckboxToggles = async () => {
  if (!hasPendingCheckboxToggle.value || !isDirty.value) return
  hasPendingCheckboxToggle.value = false

  await checkFreshness()
  if (freshnessStatus.value === "outdated") {
    await handleConflict()
    return
  }

  await performSave()
}

const debouncedSaveCheckboxToggles = useDebounceFn(
  saveCheckboxToggles,
  CHECKBOX_COMMIT_DEBOUNCE_MS
)

const onContentChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.tagName !== "INPUT" || target.type !== "checkbox") return

  if (!canToggleCheckbox.value) {
    // Read-only note: keep the rendered box matching the file on GitHub.
    target.checked = !target.checked
    return
  }

  const index = findCheckboxIndex(event.currentTarget as Element, target)
  if (index === -1) return

  rawContent.value = setCheckboxInMarkdown(
    rawContent.value,
    index,
    target.checked
  )
  hasPendingCheckboxToggle.value = true
  void debouncedSaveCheckboxToggles()
}

onUnmounted(() => {
  // Flush a pending toggle so navigating away doesn't lose it.
  void saveCheckboxToggles()
})

watch(mode, async (newMode) => {
  if (newMode === "edit") {
    void checkFreshness()
    return
  }

  const hasUserFinishedToEdit = newMode === "read" && isDirty.value

  if (!hasUserFinishedToEdit) {
    return
  }
  if (!path.value) {
    console.warn("no path found for this file")
    return
  }

  await checkFreshness()
  if (freshnessStatus.value === "outdated") {
    await handleConflict()
    return
  }

  await performSave()
})

const onConflictDiscard = async () => {
  const { raw } = await pullLatest()
  if (raw !== null) {
    rawContent.value = raw
    initialRawContent.value = raw
    advanceStackTo(latestSha.value)
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

    const hasUnsavedEdits = isDirty.value
    if (hasUnsavedEdits) {
      await handleConflict()
      return
    }

    const { raw, failureStatus } = await pullLatest()
    if (raw !== null) {
      rawContent.value = raw
      initialRawContent.value = raw
      advanceStackTo(latestSha.value)
      return
    }
    if (failureStatus === "unauthorized") {
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
          v-if="isMarkdown && canPush && loadStatus === 'ready'"
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
        <note-edit-toolbar
          v-if="canPush"
          :can-attach-audio="canAttachAudio"
          :busy="isUploading"
          @image="onImagePicked"
          @audio="onAudioPicked"
          @record="recorderOpen = true"
          @youtube="onYoutube"
        />
        <edit-note
          :key="editKey"
          v-model="rawContent"
          @caret="caretOffset = $event"
        />
      </div>
      <template v-else-if="mode === 'read'">
        <div v-if="newerSha" class="snapshot-banner">
          <span>You're viewing an older shared version.</span>
          <button
            type="button"
            class="btn bt-sm btn-soft btn-info"
            @click="viewLatest"
          >
            View latest
          </button>
        </div>
        <div
          v-if="displayedContent"
          class="note-content"
          v-html="displayedContent"
          @change="onContentChange"
        ></div>
        <note-state
          v-else
          :status="loadStatus === 'failed' ? 'failed' : 'loading'"
          @retry="loadNote"
        />
      </template>
    </section>
    <linked-notes v-if="hasBacklinks && content" :sha="sha" />
    <audio-recorder-modal
      v-if="canAttachAudio"
      v-model:open="recorderOpen"
      :busy="isUploading"
      @attach="onRecordingAttached"
    />
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

  // Same block of air the public view gives the slot: tied to the body it
  // introduces rather than to the title above it.
  .note-recording-slot .recording-player {
    margin: 2rem 0 1.5rem;
  }

  // The toolbar sits above the editor, so the editor takes what's left rather
  // than its own full height and pushing the note out of the pane.
  > .edit {
    display: flex;
    flex-direction: column;
    min-height: 0;

    > :last-child {
      flex: 1;
      min-height: 0;
    }
  }
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}

.snapshot-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0 0 1rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid $border-color;
  border-radius: 0.375rem;
  font-size: 0.85em;
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

<script lang="ts" setup>
import { computedAsync } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"

import RecordingPlayer from "@/components/RecordingPlayer.vue"
import SkeletonLoader from "@/components/SkeletonLoader.vue"
import { useATProtoLinks } from "@/hooks/useATProtoLinks.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { useMarkdownPostRender } from "@/hooks/useMarkdownPostRender.hook"
import { useNoteOverlay } from "@/hooks/useNoteOverlay.hook"
import { useNoteRecording } from "@/hooks/useNoteRecording.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { getAuthor } from "@/modules/atproto/getAuthor"
import { getUrl } from "@/modules/atproto/getUrl"
import { PublicNoteRecord } from "@/modules/atproto/publicNote.types"
import { fromShortDid } from "@/modules/atproto/shortDid"
import { withATProtoImages } from "@/modules/atproto/withATProtoImages"
import { errorMessage } from "@/utils/notif"

const props = defineProps<{
  didrkey: string
  index: number
}>()

const didrkey = computed(() => props.didrkey)
const did = computed(() => fromShortDid(props.didrkey.split("-")[0]))
const rkey = computed(() => props.didrkey.split("-")[1])
const classNameId = computed(() => didrkey.value.replaceAll(":", "-"))

const index = computed(() => props.index)

const author = computedAsync(async () => getAuthor(did.value))
const url = computedAsync(async () =>
  getUrl({ did: did.value, rkey: rkey.value })
)

const className = computed(() => `stacked-note-${props.index}`)
const titleClassName = computed(() => `title-${className.value}`)

const route = useRoute()
const mainNoteId = computed(
  () => `${route.params.shortDid}-${route.params.rkey}`
)

const { scrollToFocusedNote } = useRouteQueryStackedNotes()
const { listenToClick } = useATProtoLinks(className.value, {
  currentAtUri: didrkey,
  mainNoteId
})
const { displayNoteOverlay } = useNoteOverlay(className.value, index)

const noteNotFound = ref(false)
const noteRecord = computedAsync(async () => {
  if (!url.value) return null
  const response = await fetch(url.value)
  if (!response.ok) {
    noteNotFound.value = true
    return null
  }
  return response.json() as Promise<PublicNoteRecord>
})

watch(noteNotFound, (notFound) => {
  if (notFound) {
    errorMessage("This note no longer exists.")
  }
})
const { toHTML } = markdownBuilder()
const title = computed(() => noteRecord.value?.value.title)
const content = computed(() =>
  noteRecord.value?.value.content && author.value
    ? toHTML(
        withATProtoImages(noteRecord.value.value.content, {
          pds: author.value.pds,
          did: did.value
        })
      )
    : ""
)

const { atUri: recordingAtUri, recording } = useNoteRecording(did, rkey)

// Same slot as the main note view, same guard: a note written under the old
// model carries the at-uri in its markdown and markdown-it-recording already
// mounts a player there, so the fixed slot would play the same audio twice.
const showRecording = computed(
  () =>
    !!recording.value &&
    !!content.value &&
    !noteRecord.value?.value.content.includes(recordingAtUri.value)
)

useMarkdownPostRender(content, () => `.note-${classNameId.value}`, {
  onReady: () => listenToClick(),
  tikz: true,
  macroplan: true
})
</script>

<template>
  <div
    class="stacked-note"
    :class="{
      [className]: true,
      overlay: displayNoteOverlay,
      [`note-${classNameId}`]: true
    }"
  >
    <a
      class="title-stacked-note-link"
      @click.prevent="scrollToFocusedNote({ noteId: didrkey })"
    >
      <div
        class="title-stacked-note breadcrumbs text-sm"
        :class="titleClassName"
      >
        <span v-if="author">{{ author.handle }}&nbsp;•&nbsp;</span> {{ title }}
      </div>
    </a>
    <section class="text-content">
      <!-- Inside the section rather than above it so the player lines up with
           the body's padding, and ahead of the content chain so it stays
           between the title and the body without breaking the v-else-if. -->
      <recording-player
        v-if="showRecording"
        :at-uri="recordingAtUri"
        :alt="title ?? ''"
        :recording="recording"
      />
      <div v-if="noteNotFound" class="alert alert-error">
        This note no longer exists.
      </div>
      <div class="note-content" v-else-if="content" v-html="content"></div>
      <skeleton-loader v-else-if="!noteNotFound" />
    </section>
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

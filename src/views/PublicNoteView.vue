<script setup lang="ts">
import { computedAsync } from "@vueuse/core"
import { useTitle } from "@vueuse/core"
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

import HomeButton from "@/components/HomeButton.vue"
import RecordingPlayer from "@/components/RecordingPlayer.vue"
import SharePublicNote from "@/components/SharePublicNote.vue"
import SkeletonLoader from "@/components/SkeletonLoader.vue"
import StackedPublicNote from "@/components/StackedPublicNote.vue"
import ThemeSwap from "@/components/ThemeSwap.vue"
import { useATProtoLinks } from "@/hooks/useATProtoLinks.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { useMarkdownPostRender } from "@/hooks/useMarkdownPostRender.hook"
import { useNoteRecording } from "@/hooks/useNoteRecording.hook"
import { useResizeContainer } from "@/hooks/useResizeContainer.hook"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { getAuthor } from "@/modules/atproto/getAuthor"
import { getUrl } from "@/modules/atproto/getUrl"
import type { PublicNoteRecord } from "@/modules/atproto/publicNote.types"
import { fromShortDid } from "@/modules/atproto/shortDid"
import { withATProtoImages } from "@/modules/atproto/withATProtoImages"
import { displayLanguage } from "@/utils/displayLanguage"
import { downloadFont } from "@/utils/downloadFont"
import { errorMessage } from "@/utils/notif"
import { slugify } from "@/utils/slugify"
import { stripLeadingTitle } from "@/utils/stripLeadingTitle"

const props = defineProps<{ shortDid: string; rkey: string; slug?: string }>()
const router = useRouter()
const did = computed(() => fromShortDid(props.shortDid))
const rkey = computed(() => props.rkey)

const author = computedAsync(async () => getAuthor(did.value))
const url = computedAsync(
  async () => getUrl({ did: did.value, rkey: rkey.value }),
  null
)

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
    router.replace({ name: "SpaceCowboy" })
  }
})

watch(noteRecord, () => {
  if (
    noteRecord.value?.value.title &&
    props.slug &&
    props.slug !== slugify(noteRecord.value.value.title)
  ) {
    router.replace({ name: "SpaceCowboy" })
    return
  }

  if (noteRecord.value?.value.fontFamily) {
    downloadFont(noteRecord.value.value.fontFamily)
  }

  if (noteRecord.value?.value.fontSize) {
    const root = document.documentElement
    root.style.setProperty(
      "--font-size",
      `${noteRecord.value.value.fontSize}pt`
    )
  }
})

const { toHTML } = markdownBuilder()

const title = computed(() => noteRecord.value?.value.title)
const content = computed(() =>
  noteRecord.value?.value.content && author.value
    ? toHTML(
        withATProtoImages(
          stripLeadingTitle(noteRecord.value.value.content, title.value),
          {
            pds: author.value.pds,
            did: did.value
          }
        )
      )
    : ""
)

const { atUri: recordingAtUri, recording } = useNoteRecording(did, rkey)

/**
 * The recording takes its slot only once the note is here and only if the note
 * does not already place it itself: a note written under the old model carries
 * the at-uri inline in its markdown, where markdown-it-recording mounts a
 * player of its own. Waiting for the content also avoids showing the slot above
 * the skeleton and then moving it when the inline copy turns up.
 */
const showRecording = computed(
  () =>
    !!recording.value &&
    !!content.value &&
    !noteRecord.value?.value.content.includes(recordingAtUri.value)
)

const breadcrumb = computed(() =>
  title.value
    ? author.value?.handle
      ? `${title.value} • ${author.value.handle}`
      : title.value
    : `Remanso`
)

useTitle(breadcrumb)

const publishedAt = computed(() =>
  noteRecord.value?.value.publishedAt
    ? new Date(noteRecord.value?.value.publishedAt).toLocaleDateString()
    : null
)
const language = computed(() =>
  noteRecord.value?.value.language
    ? displayLanguage(noteRecord.value.value.language)
    : null
)

const mainNoteId = computed(() => `${props.shortDid}-${props.rkey}`)

const { stackedNotes, scrollToFocusedNote, scrollToLastStackedNote } =
  useRouteQueryStackedNotes()
const { listenToClick } = useATProtoLinks("note-display", { mainNoteId })
useResizeContainer("note-container", stackedNotes)

onMounted(() => {
  scrollToLastStackedNote()
})

useMarkdownPostRender(content, () => ".public-note-view .note-display", {
  onReady: () => listenToClick(),
  tikz: true,
  macroplan: true
})
</script>

<template>
  <main class="public-note-view repo-note note-container">
    <div class="note article">
      <div class="header">
        <theme-swap class="header-start" />
        <home-button class="header-center" />
        <share-public-note v-if="content" class="header-end" />
      </div>
      <div class="repo-title-breadcrumb">
        <a
          class="title-stacked-note-link"
          @click.prevent="scrollToFocusedNote()"
          v-if="breadcrumb"
          >{{ breadcrumb }}</a
        >
      </div>
      <div class="repo-title">
        <h1 class="heading-1" v-if="title">{{ title }}</h1>
        <div class="skeleton h-8 w-64" v-else-if="!noteNotFound"></div>

        <div class="note-meta" v-if="author && content">
          <template v-if="language">
            <span>{{ language }}</span>
            <span>&nbsp;•&nbsp;</span>
          </template>
          <router-link
            :to="{ name: 'PublicNoteListByDidView', params: { shortDid } }"
            class="link link-hover handle"
          >
            {{ author.handle }}
          </router-link>
          <template v-if="publishedAt">
            <span>&nbsp;•&nbsp;</span>
            <span>{{ publishedAt }}</span>
          </template>
        </div>
        <div class="skeleton h-4 w-50" v-else-if="!noteNotFound"></div>
      </div>

      <recording-player
        v-if="showRecording"
        :at-uri="recordingAtUri"
        :alt="title ?? ''"
        :recording="recording"
      />

      <article class="note-display" v-if="content" v-html="content"></article>
      <skeleton-loader v-else-if="!noteNotFound" />
    </div>
    <stacked-public-note
      v-for="(stackedNote, index) in stackedNotes"
      :key="stackedNote"
      class="note"
      :index="index"
      :didrkey="stackedNote"
    />
  </main>
</template>

<style lang="scss">
.public-note-view {
  display: flex;
  flex: 1;
  width: 100%;

  // Three fixed slots rather than space-between: the theme pill and the share
  // circle don't measure the same, so only a dedicated centre column puts the
  // logo on the same axis as the title and meta below — and keeps it there while
  // the share button is still waiting on the note content.
  .header {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
  }

  .header-start {
    justify-self: start;
  }

  .header-center {
    justify-self: center;
  }

  .header-end {
    justify-self: end;
  }

  .heading-1 {
    display: inline-block;
  }

  .repo-title {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    .heading-1 {
      margin-bottom: 0.25rem;
    }

    // House-style metadata: small + muted. The handle keeps the theme-adaptive,
    // contrast-safe accent (--link-accent pins lightness per light/dark while
    // keeping the accent hue; raw --color-accent is unreadable on light themes,
    // e.g. pale yellow on white on cmyk). Language, date and separators inherit
    // the muted look.
    .note-meta {
      font-size: 0.8em;
      opacity: 0.8;

      .handle {
        color: var(--link-accent);
      }
    }
  }

  h1 {
    font-size: 2rem;
  }

  .article {
    padding: 0 2rem;
    scrollbar-width: none;
    left: 0;
    top: 0;

    // The recording is data attached to the note, not a paragraph of it, so it
    // gets a block of its own: more air above than below, which ties it to the
    // body it introduces rather than to the meta. Selector sits inside .article
    // on purpose — the player's own scoped margin would otherwise outweigh it.
    // Nothing is rendered at all when there is no recording, so notes without
    // audio keep the body exactly where it was.
    .recording-player {
      margin: 2rem 0 1.5rem;
    }
  }

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

  .note {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    height: 100vh;
    width: 100%;

    .title {
      text-align: left;
    }
  }

  @media screen and (min-width: 769px) {
    background-color: var(--note-canvas-bg);

    .repo-title-breadcrumb {
      padding: 0.5rem 1rem 0;
      transform-origin: 0 0;
      transform: rotate(90deg);
      font-size: 0.8em;
      text-wrap: nowrap;

      a {
        color: var(--color-base-content);
        display: block;
        text-align: center;
      }
    }

    .note {
      min-width: var(--note-width);
      max-width: var(--note-width);
      background-color: var(--color-base-100);
    }

    .article {
      box-shadow: var(--note-sheet-shadow);
    }
  }

  @media screen and (max-width: 768px) {
    flex-wrap: wrap;

    .repo-title-breadcrumb {
      display: none;
    }

    .article article {
      margin-top: 48px;
    }
  }
}
</style>

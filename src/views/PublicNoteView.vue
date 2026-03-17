<script setup lang="ts">
import { useATProtoLinks } from "@/hooks/useATProtoLinks.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import BackButton from "@/components/BackButton.vue"
import StackedPublicNote from "@/components/StackedPublicNote.vue"
import { useRouteQueryStackedNotes } from "@/hooks/useRouteQueryStackedNotes.hook"
import { getAuthor } from "@/modules/atproto/getAuthor"
import type { PublicNoteRecord } from "@/modules/atproto/publicNote.types"
import { withATProtoImages } from "@/modules/atproto/withATProtoImages"
import { getUrl } from "@/modules/atproto/getUrl"
import { fromShortDid } from "@/modules/atproto/shortDid"
import { downloadFont } from "@/utils/downloadFont"
import { slugify } from "@/utils/slugify"
import { computedAsync } from "@vueuse/core"
import { computed, nextTick, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { errorMessage } from "@/utils/notif"
import { useResizeContainer } from "@/hooks/useResizeContainer.hook"
import ThemeSwap from "@/components/ThemeSwap.vue"
import { useTitle } from "@vueuse/core"
import { displayLanguage } from "@/utils/displayLanguage"

const props = defineProps<{ shortDid: string; rkey: string; slug?: string }>()
const router = useRouter()
const did = computed(() => fromShortDid(props.shortDid))
const rkey = computed(() => props.rkey)

const author = computedAsync(async () => getAuthor(did.value))
const url = computedAsync(
  async () => getUrl({ did: did.value, rkey: rkey.value }),
  null,
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
      `${noteRecord.value.value.fontSize}pt`,
    )
  }
})

const { toHTML } = markdownBuilder()

const title = computed(() => noteRecord.value?.value.title)
const content = computed(() =>
  noteRecord.value?.value.content && author.value
    ? toHTML(
        withATProtoImages(noteRecord.value.value.content, {
          pds: author.value.pds,
          did: did.value,
        }),
      )
    : "",
)

const breadcrumb = computed(() =>
  title.value
    ? author.value?.handle
      ? `${title.value} • ${author.value.handle}`
      : title.value
    : `Remanso`,
)

useTitle(breadcrumb)

const publishedAt = computed(() =>
  noteRecord.value?.value.publishedAt
    ? new Date(noteRecord.value?.value.publishedAt).toLocaleDateString()
    : null,
)
const language = computed(() =>
  noteRecord.value?.value.language
    ? displayLanguage(noteRecord.value.value.language)
    : null,
)

const { stackedNotes, scrollToFocusedNote } = useRouteQueryStackedNotes()
const { listenToClick } = useATProtoLinks("note-display")
useResizeContainer("note-container", stackedNotes)

watch(
  content,
  async () => {
    await nextTick()
    listenToClick()
  },
  { immediate: true },
)
</script>

<template>
  <main class="public-note-view repo-note note-container">
    <div class="note article">
      <div class="header">
        <back-button
          :fallback="{ name: 'PublicNoteListByDidView', params: { shortDid } }"
          :prefer-fallback="false"
        />

        <theme-swap />
      </div>
      <div class="subheader">
        <span
          class="badge badge-author badge-soft badge-accent"
          v-if="author && content"
        >
          <template v-if="language">
            <span>{{ language }}</span>
            <span>&nbsp;•&nbsp;</span>
          </template>
          <router-link
            :to="{ name: 'PublicNoteListByDidView', params: { shortDid } }"
            class="link link-hover"
          >
            {{ author.handle }}
          </router-link>
          <template v-if="publishedAt">
            <span>&nbsp;•&nbsp;</span>
            <span>{{ publishedAt }}</span>
          </template>
        </span>
        <div class="badge skeleton h-4 w-50" v-else></div>
      </div>
      <div class="repo-title-breadcrumb">
        <a
          class="title-stacked-note-link"
          @click.prevent="scrollToFocusedNote()"
          v-if="breadcrumb"
          >{{ breadcrumb }}</a
        >
      </div>

      <article class="note-display" v-html="content"></article>
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

  .header {
    margin-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .subheader {
    margin: 1rem auto 0;
  }

  h1 {
    font-size: 2rem;
  }

  .article {
    padding: 0 2rem;
    scrollbar-width: none;
    left: 0;
    top: 0;
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
    position: sticky;

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

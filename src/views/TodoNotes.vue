<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch } from "vue"

import { useCheckboxCommit } from "@/hooks/useCheckboxCommit.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"

type Prop = {
  user: string
  repo: string
}

const FluxNote = defineAsyncComponent(() => import("@/components/FluxNote.vue"))
const props = defineProps<Prop>()
const user = computed(() => props.user)
const repo = computed(() => props.repo)

const store = useUserRepoStore()

const todoNote = computed(() =>
  store.files.find((file) => file.path?.endsWith("_todo/todo.md"))
)

const sha = computed(() => todoNote.value?.sha ?? "")
const path = computed(() => todoNote.value?.path)

const canPush = computed(() => store.canPush)

const { toHTML } = markdownBuilder(repo)

const { pendingContent, syncContent, listenToCheckboxes, hasPendingChanges } =
  useCheckboxCommit({
    user: props.user,
    repo: props.repo,
    path,
    initialContent: "",
    initialSha: sha,
    containerSelector: ".todo-notes .note-display",
    debounceMs: 1000,
    enabled: canPush
  })

// Render pending content to HTML for display
const renderedContent = computed(() => {
  if (!pendingContent.value) {
    return ""
  }
  return toHTML(pendingContent.value)
})

// Fetch raw content when sha changes
watch(
  sha,
  async (newSha) => {
    if (!newSha || hasPendingChanges.value) {
      return
    }
    const base64Content = await queryFileContent(props.user, props.repo, newSha)
    if (base64Content) {
      const rawContent = decodeBase64ToUTF8(base64Content)
      syncContent(rawContent, newSha)
    }
  },
  { immediate: true }
)

// Setup checkbox listeners when content renders or canPush changes
watch(
  [renderedContent, canPush],
  async () => {
    await nextTick()
    listenToCheckboxes()
  },
  { immediate: true }
)
</script>

<template>
  <div class="todo-notes">
    <flux-note
      key="todo-notes"
      :user="user"
      :repo="repo"
      :content="renderedContent"
      :parse-content="false"
    />
  </div>
</template>

<style lang="scss">
.todo-notes {
  .note-display {
    h1 {
      font-size: 1.8rem;
    }
  }

  input[type="checkbox"] {
    margin-right: 0.5rem;
  }
}
</style>

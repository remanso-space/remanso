import { useDebounceFn } from "@vueuse/core"
import { onUnmounted, Ref, ref, toValue } from "vue"

import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { FileLine, parseFile, serializeFile } from "@/utils/todotxt"

export const useTodoTxtCommit = ({
  user,
  repo,
  path,
  initialContent,
  initialSha,
  debounceMs = 1000
}: {
  user: string
  repo: string
  path: Ref<string | undefined> | string | undefined
  initialContent: Ref<string> | string
  initialSha: Ref<string> | string
  debounceMs?: number
}) => {
  const { updateFile } = useGitHubContent({ user, repo })

  const items = ref<FileLine[]>(parseFile(toValue(initialContent)))
  const currentSha = ref(toValue(initialSha))
  const isCommitting = ref(false)
  const hasPendingChanges = ref(false)

  // Re-seed from a freshly fetched file. We must not blow away in-flight edits.
  const syncContent = (content: string, sha: string) => {
    if (!hasPendingChanges.value) {
      items.value = parseFile(content)
      currentSha.value = sha
    }
  }

  const commitChanges = async () => {
    const pathValue = toValue(path)
    if (!pathValue || !hasPendingChanges.value) {
      return
    }

    if (isCommitting.value) {
      debouncedCommit()
      return
    }

    isCommitting.value = true

    const { sha: newSha } = await updateFile({
      content: serializeFile(items.value),
      path: pathValue,
      sha: currentSha.value
    })

    if (newSha) {
      currentSha.value = newSha
      hasPendingChanges.value = false
    }

    isCommitting.value = false
  }

  const debouncedCommit = useDebounceFn(commitChanges, debounceMs)

  const mutate = (mutator: (current: FileLine[]) => FileLine[]) => {
    items.value = mutator(items.value)
    hasPendingChanges.value = true
    debouncedCommit()
  }

  onUnmounted(() => {
    // Flush any pending edit on unmount so navigation doesn't lose work.
    if (hasPendingChanges.value) {
      commitChanges()
    }
  })

  return {
    items,
    currentSha,
    isCommitting,
    hasPendingChanges,
    syncContent,
    mutate
  }
}

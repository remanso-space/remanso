import { useDebounceFn } from "@vueuse/core"
import { onUnmounted, Ref, ref, toValue } from "vue"

import { useGitHubContent } from "@/hooks/useGitHubContent.hook"

const CHECKBOX_PATTERN = /\[([ xX])\]/g

const setCheckboxInMarkdown = (
  markdown: string,
  index: number,
  checked: boolean
): string => {
  let currentIndex = 0

  return markdown.replace(CHECKBOX_PATTERN, (match) => {
    if (currentIndex++ === index) {
      return checked ? "[x]" : "[ ]"
    }
    return match
  })
}

const findCheckboxIndex = (
  container: Element,
  checkbox: HTMLInputElement
): number => {
  const allCheckboxes = container.querySelectorAll('input[type="checkbox"]')
  return Array.from(allCheckboxes).indexOf(checkbox)
}

export const useCheckboxCommit = ({
  user,
  repo,
  path,
  initialContent,
  initialSha,
  containerSelector,
  debounceMs = 1000
}: {
  user: string
  repo: string
  path: Ref<string | undefined> | string | undefined
  initialContent: Ref<string> | string
  initialSha: Ref<string> | string
  containerSelector: string
  debounceMs?: number
}) => {
  const { updateFile } = useGitHubContent({ user, repo })

  const pendingContent = ref(toValue(initialContent))
  const currentSha = ref(toValue(initialSha))
  const isCommitting = ref(false)
  const hasPendingChanges = ref(false)

  // Update pending content when initial content changes (e.g., after fetch)
  const syncContent = (content: string, sha: string) => {
    if (!hasPendingChanges.value) {
      pendingContent.value = content
      currentSha.value = sha
    }
  }

  const commitChanges = async () => {
    const pathValue = toValue(path)
    if (!pathValue || !hasPendingChanges.value) {
      return
    }

    // If already committing, the debounce will re-trigger after
    if (isCommitting.value) {
      debouncedCommit()
      return
    }

    isCommitting.value = true

    const { sha: newSha } = await updateFile({
      content: pendingContent.value,
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

  const handleCheckboxChange = (event: Event) => {
    const target = event.target as HTMLInputElement

    if (target.tagName !== "INPUT" || target.type !== "checkbox") {
      return
    }

    const container = document.querySelector(containerSelector)
    if (!container) {
      return
    }

    const index = findCheckboxIndex(container, target)
    if (index === -1) {
      return
    }

    pendingContent.value = setCheckboxInMarkdown(
      pendingContent.value,
      index,
      target.checked
    )
    hasPendingChanges.value = true

    // Schedule commit
    debouncedCommit()
  }

  const removeListeners = () => {
    const container = document.querySelector(containerSelector)
    if (container) {
      container.removeEventListener("change", handleCheckboxChange)
    }
  }

  const listenToCheckboxes = () => {
    removeListeners()
    const container = document.querySelector(containerSelector)
    if (container) {
      container.addEventListener("change", handleCheckboxChange)
    }
  }

  onUnmounted(() => {
    removeListeners()
  })

  return {
    pendingContent,
    currentSha,
    isCommitting,
    hasPendingChanges,
    syncContent,
    listenToCheckboxes
  }
}

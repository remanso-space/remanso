import { markdownItPlugin } from "./markdown-it-regexp"

// Matches :icon-name: where icon-name is letters, digits, hyphens
export const markdownItTablerIcons = markdownItPlugin(
  /:([\w-]+):/,
  (match) => {
    const name = match[0][1]
    return `<i class="ti ti-${name}"></i>`
  },
)

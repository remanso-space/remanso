const CHECKBOX_PATTERN = /\[([ xX])\]/g

// Rewrite the nth `[ ]` / `[x]` in the markdown source. The index comes from
// the rendered DOM, which lists checkboxes in source order, so the two stay
// aligned as long as we count the same way.
export const setCheckboxInMarkdown = (
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

export const findCheckboxIndex = (
  container: Element,
  checkbox: HTMLInputElement
): number => {
  const allCheckboxes = container.querySelectorAll('input[type="checkbox"]')
  return Array.from(allCheckboxes).indexOf(checkbox)
}

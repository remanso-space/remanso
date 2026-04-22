let cached: number | undefined

export const getNoteWidth = () => {
  if (cached === undefined) {
    cached = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--note-width"
      )
    )
  }
  return cached
}

export const resetNoteWidthCache = () => {
  cached = undefined
}

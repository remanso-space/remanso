export const displayLanguage = (langCode?: string): string | null => {
  if (!langCode) {
    return null
  }

  try {
    const locale = navigator.language ?? langCode
    const display = new Intl.DisplayNames([locale], {
      type: "language"
    })

    return display.of(langCode) ?? null
  } catch (err) {
    console.warn("error", err)

    return null
  }
}

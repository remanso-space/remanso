import FontFaceObserver from "fontfaceobserver"

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded"
])

const parseWebFontFamilies = (font: string): string[] =>
  font
    .split(",")
    .map((f) => f.trim().replace(/^["']|["']$/g, ""))
    .filter((f) => f && !GENERIC_FAMILIES.has(f))

const assembleFontLink = (families: string[]): string | null => {
  if (families.length === 0) return null
  return `https://api.fonts.coollabs.io/css2?display=swap&${families
    .map((f) => `family=${f.replaceAll(" ", "+")}`)
    .join("&")}`
}

export const downloadFont = async (
  font: string,
  cssVar = "--font-family"
): Promise<void> => {
  const families = parseWebFontFamilies(font)
  const href = assembleFontLink(families)

  if (href) {
    const alreadyLoaded = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    ).some((link) => link.href === href)

    if (!alreadyLoaded) {
      const link = document.createElement("link")
      link.href = href
      link.rel = "stylesheet"
      document.head.appendChild(link)
    }

    try {
      await new FontFaceObserver(families[0]).load()
    } catch {
      console.warn("error when loading font")
    }
  }

  document.documentElement.style.setProperty(cssVar, font)
}

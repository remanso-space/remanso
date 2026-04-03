import FontFaceObserver from "fontfaceobserver"

const assembleFontLink = (font: string) => {
  return `https://api.fonts.coollabs.io/css2?display=swap&family=${font
    .replaceAll(",", "&family=")
    .replaceAll(" ", "+")}`
}

export const downloadFont = async (
  font: string,
  cssVar = "--font-family"
): Promise<void> => {
  const href = assembleFontLink(font)

  // check if the href already exists
  const existingLink = document.querySelector(`link[href="${href}"]`)

  if (!existingLink) {
    const link = document.createElement("link")
    link.href = href
    link.rel = "stylesheet"

    document.head.appendChild(link)
  }

  try {
    await new FontFaceObserver(font).load()

    document.documentElement.style.setProperty(cssVar, font)
  } catch (error) {
    console.warn("error when loading font")
  }
}

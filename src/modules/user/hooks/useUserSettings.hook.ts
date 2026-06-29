import { watchEffect } from "vue"

import { resetNoteWidthCache } from "@/constants/note-width"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { downloadFont } from "@/utils/downloadFont"

const DEFAULT_FONT_POLICY = '"Libertinus Serif", serif'
const DEFAULT_FONT_SIZE = "16px"
const DEFAULT_NOTE_WIDTH = "500px"

export const useUserSettings = () => {
  const store = useUserRepoStore()

  watchEffect(() => {
    const root = document.documentElement

    const fontSize = store.userSettings?.chosenFontSize
    const bodyFont = store.userSettings?.chosenBodyFont
    const headingFont = store.userSettings?.chosenHeadingFont

    downloadFont(bodyFont || DEFAULT_FONT_POLICY, "--font-family")
    downloadFont(
      headingFont || bodyFont || DEFAULT_FONT_POLICY,
      "--heading-font-family"
    )
    root.style.setProperty("--font-size", fontSize || DEFAULT_FONT_SIZE)

    const pageWidth = store.userSettings?.pageWidth ?? DEFAULT_NOTE_WIDTH
    root.style.setProperty("--note-width", pageWidth)
    resetNoteWidthCache()
  })
}

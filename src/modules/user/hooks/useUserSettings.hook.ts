import { watchEffect } from "vue"

import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { downloadFont } from "@/utils/downloadFont"

const DEFAULT_FONT_POLICY = '"Libertinus Serif", serif'
const DEFAULT_FONT_SIZE = "16px"

export const useUserSettings = () => {
  const store = useUserRepoStore()

  watchEffect(() => {
    const root = document.documentElement

    const fontSize = store.userSettings?.chosenFontSize
    const bodyFont = store.userSettings?.chosenBodyFont
    const titleFont = store.userSettings?.chosenTitleFont

    downloadFont(bodyFont || DEFAULT_FONT_POLICY, "--font-family")
    downloadFont(
      titleFont || bodyFont || DEFAULT_FONT_POLICY,
      "--title-font-family"
    )
    root.style.setProperty("--font-size", fontSize || DEFAULT_FONT_SIZE)
  })
}

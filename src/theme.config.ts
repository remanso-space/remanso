// Theme names are defined in src/styles/app.css (@plugin "daisyui/theme").
export const themeConfig = {
  light: "remanso",
  dark: "remanso-nuit"
}

const STORAGE_KEY = "is-dark"

export const isDarkPreferred = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) {
    return stored === "true"
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
}

export const applyTheme = (isDark: boolean, persist = false) => {
  if (persist) {
    localStorage.setItem(STORAGE_KEY, isDark ? "true" : "false")
  }
  document.documentElement.dataset.theme = isDark
    ? themeConfig.dark
    : themeConfig.light
}

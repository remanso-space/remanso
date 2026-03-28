import { useMagicKeys } from "@vueuse/core"
import { ref, watch } from "vue"

export const useEditionMode = () => {
  const mode = ref<"read" | "edit">("read")
  const toggleMode = () => {
    mode.value = mode.value === "read" ? "edit" : "read"
  }

  const { escape } = useMagicKeys()

  watch(escape, () => {
    if (mode.value === "edit") {
      toggleMode()
    }
  })

  return {
    mode,
    toggleMode
  }
}

import { Ref, ref, watch } from "vue"

import { getFollows } from "@/modules/atproto/service/getFollows"

export const useFollows = (did: Ref<string | null>) => {
  const follows = ref<Set<string>>(new Set())

  watch(
    did,
    async (value) => {
      if (value) {
        follows.value = await getFollows(value)
      } else {
        follows.value = new Set()
      }
    },
    { immediate: true }
  )

  return { follows }
}

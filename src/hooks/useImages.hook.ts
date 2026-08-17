import { nextTick, type Ref, watch } from "vue"

import { useFile } from "@/hooks/useFile.hook"
import { resolvePath } from "@/modules/repo/services/resolvePath"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { toImageDataUrl } from "@/utils/imageDataUrl"

/**
 * Rewrites the images of a rendered note to inline data URLs, so a repo-relative
 * `src` resolves against the repo tree instead of the app's own origin.
 *
 * `notePath` is the path the sources are relative to, and re-runs on the file
 * list because the tree can land after the note is on screen — the README of a
 * repo renders from its own request, before `getFiles` resolves.
 */
export const useImages = (
  scope: () => string,
  notePath: () => string | null | undefined,
  trigger: Ref<unknown>
) => {
  const store = useUserRepoStore()

  watch(
    [notePath, () => store.files, trigger],
    async ([filePath]) => {
      if (!filePath) {
        return
      }

      await nextTick()

      const images = document.querySelectorAll(`${scope()} img`)

      images.forEach(async (image) => {
        const src = image.getAttribute("src")
        // `.tikz` embeds are diagrams, not images — runTikzEmbeds swaps them
        // for a rendered block.
        if (!src || src.startsWith("data:") || src.endsWith(".tikz")) {
          return
        }

        const imageFilePath = resolvePath(filePath, src)

        const imageFile = store.files.find(
          (file) => file.path === imageFilePath
        )

        if (!imageFile?.sha) {
          return
        }
        const { getCachedFileContent } = useFile(imageFile.sha, false)

        const fileContent = await getCachedFileContent()

        if (!fileContent) {
          return
        }

        image.setAttribute("src", toImageDataUrl(imageFilePath, fileContent))
      })
    },
    { immediate: true }
  )
}

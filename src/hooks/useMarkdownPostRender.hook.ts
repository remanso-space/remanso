import { nextTick, type Ref, toValue, watch } from "vue"

import { useImages } from "@/hooks/useImages.hook"
import {
  runMermaid,
  runTikz,
  useShikiji
} from "@/hooks/useMarkdown.hook"

interface MarkdownPostRenderOptions {
  onReady?: () => void
  tikz?: boolean
  mermaid?: () => boolean
  shikiji?: () => boolean
  images?: () => string | null | undefined
  triggers?: Ref<unknown>[]
}

export const useMarkdownPostRender = (
  contentRef: Ref<unknown>,
  scopeSelector: () => string,
  options: MarkdownPostRenderOptions = {}
) => {
  const sources = [contentRef, ...(options.triggers ?? [])]

  watch(
    sources,
    async () => {
      if (!toValue(contentRef)) return
      await nextTick()
      options.onReady?.()

      const scope = scopeSelector()

      if (options.tikz) {
        void runTikz(`${scope} .tikz`)
      }

      if (options.mermaid?.()) {
        runMermaid(`${scope} .mermaid`)
      }

      if (options.shikiji?.()) {
        void useShikiji()
      }

      const imagesSha = options.images?.()
      if (imagesSha) {
        useImages(imagesSha)
      }
    },
    { immediate: true }
  )
}

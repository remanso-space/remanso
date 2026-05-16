import { nextTick, type Ref, toValue, watch } from "vue"

import { useImages } from "@/hooks/useImages.hook"
import {
  runMermaid,
  runTikz,
  useShikiji
} from "@/hooks/useMarkdown.hook"
import { attachSvgDownloads } from "@/utils/svgDownload"

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
      const wantsTikz = !!options.tikz
      const wantsMermaid = !!options.mermaid?.()

      const renderJobs: Promise<unknown>[] = []
      if (wantsTikz) {
        renderJobs.push(runTikz(`${scope} .tikz`))
      }

      if (wantsMermaid) {
        renderJobs.push(runMermaid(`${scope} .mermaid`))
      }

      if (options.shikiji?.()) {
        void useShikiji()
      }

      const imagesSha = options.images?.()
      if (imagesSha) {
        useImages(imagesSha)
      }

      if (wantsTikz || wantsMermaid) {
        await Promise.allSettled(renderJobs)
        await nextTick()
        attachSvgDownloads(document.querySelector(scope))
      }
    },
    { immediate: true }
  )
}

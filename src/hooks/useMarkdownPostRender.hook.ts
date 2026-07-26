import { nextTick, type Ref, toValue, watch } from "vue"

import { useImages } from "@/hooks/useImages.hook"
import { runMermaid, runTikz, useShikiji } from "@/hooks/useMarkdown.hook"
import { runInstruments } from "@/modules/instruments/runInstruments"
import { runMacroplan } from "@/modules/macroplan/runMacroplan"
import { attachSvgDownloads } from "@/utils/svgDownload"

interface MarkdownPostRenderOptions {
  onReady?: () => void
  tikz?: boolean
  macroplan?: boolean
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

      if (options.macroplan) {
        renderJobs.push(runMacroplan(`${scope} .macroplan-block`))
      }

      // Unconditional: cost is one querySelectorAll when no blocks exist,
      // and every view (repo + public ATProto) gets instruments for free.
      renderJobs.push(runInstruments(`${scope} .instrument-block`))

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

import { nextTick, type Ref, toValue, watch } from "vue"

import { runTikzEmbeds } from "@/hooks/runTikzEmbeds"
import { useImages } from "@/hooks/useImages.hook"
import { runMermaid, runTikz, useShikiji } from "@/hooks/useMarkdown.hook"
import { mountNoteRecording } from "@/modules/atproto/mountNoteRecording"
import { runRecordings } from "@/modules/atproto/runRecordings"
import { runInstruments } from "@/modules/instruments/runInstruments"
import { runMacroplan } from "@/modules/macroplan/runMacroplan"
import { attachSvgDownloads } from "@/utils/svgDownload"

interface MarkdownPostRenderOptions {
  onReady?: () => void
  tikz?: boolean
  /**
   * The sha of the note being rendered, for views whose repo files are
   * reachable — lets `![](diagram.tikz)` embeds pull their source. Returns
   * null when the note has no such embed to resolve.
   */
  tikzEmbeds?: () => string | null
  macroplan?: boolean
  mermaid?: () => boolean
  shikiji?: () => boolean
  /**
   * The path the note's images are relative to, for views whose repo files are
   * reachable. Returns null when they can't be resolved against a repo tree.
   */
  images?: () => string | null | undefined
  /**
   * The at-uri of the recording attached to this note, for views whose title
   * is part of the rendered markdown rather than a field of its own. Returns
   * null when there is nothing to attach, or when the note already embeds the
   * recording inline and the placeholder handles it.
   */
  noteRecording?: () => { atUri: string; alt: string } | null
  triggers?: Ref<unknown>[]
}

export const useMarkdownPostRender = (
  contentRef: Ref<unknown>,
  scopeSelector: () => string,
  options: MarkdownPostRenderOptions = {}
) => {
  const sources = [contentRef, ...(options.triggers ?? [])]

  // Outside the render watcher: the repo tree images resolve against can land
  // after the note does, and useImages watches for it on its own.
  if (options.images) {
    useImages(scopeSelector, options.images, contentRef)
  }

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

        // `.tikz` file embeds need their source fetched first; render them in
        // a second pass rather than holding the inline blocks back.
        const embedSha = options.tikzEmbeds?.()
        if (embedSha) {
          renderJobs.push(
            runTikzEmbeds(scope, embedSha).then(() => runTikz(`${scope} .tikz`))
          )
        }
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

      // Unconditional for the same reason as instruments: one querySelectorAll
      // when no recording exists, and both the repo and public views get
      // players without another option flag.
      renderJobs.push(runRecordings(`${scope} .recording-block`))

      const attached = options.noteRecording?.()
      if (attached) {
        renderJobs.push(
          mountNoteRecording(
            `${scope} .note-content`,
            attached.atUri,
            attached.alt
          )
        )
      }

      if (options.shikiji?.()) {
        void useShikiji()
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

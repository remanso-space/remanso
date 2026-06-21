<script lang="ts" setup>
import { useEventListener } from "@vueuse/core"
import { ref, watch } from "vue"

import { useImageLightbox } from "@/hooks/useImageLightbox.hook"
import { svgToDataUrl } from "@/utils/svgDownload"

const { isOpen, src, alt, open, close } = useImageLightbox()

const dialogRef = ref<HTMLDialogElement | null>(null)

const onClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.closest(".svg-download-buttons")) return

  const svg = target.closest<SVGSVGElement>(".tikz svg, .mermaid svg")
  if (svg) {
    event.preventDefault()
    open(svgToDataUrl(svg), "diagram")
    return
  }

  const img = target.closest("img")
  if (img && img.closest(".note-content, .note-display")) {
    event.preventDefault()
    open(img.currentSrc || img.src, img.alt)
  }
}

useEventListener(document, "click", onClick)

watch(isOpen, (value) => {
  const el = dialogRef.value
  if (!el) return
  if (value && !el.open) el.showModal()
  else if (!value && el.open) el.close()
})
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal image-lightbox not-prose"
    @close="close()"
    @click="close()"
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="max-h-[96vh] max-w-[96vw] rounded-lg bg-white p-3 cursor-zoom-out"
    />
  </dialog>
</template>

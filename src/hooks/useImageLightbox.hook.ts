import { ref } from "vue"

const isOpen = ref(false)
const src = ref("")
const alt = ref("")

export const useImageLightbox = () => {
  const open = (imageSrc: string, imageAlt = "") => {
    src.value = imageSrc
    alt.value = imageAlt
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  return { isOpen, src, alt, open, close }
}

<script setup lang="ts">
import { computed } from "vue"

import ThemeSwap from "@/components/ThemeSwap.vue"

import { useUserRepoStore } from "../modules/repo/store/userRepo.store"

const store = useUserRepoStore()

const DEFAULT_FONT_FAMILIES = [
  "EB Garamond",
  "Inter",
  "Lato",
  "Libertinus Serif",
  "Lora",
  "Merriweather",
  "Playfair Display",
  "Roboto",
  "Source Serif 4"
]

const fontFamilies = computed(
  () => store.userSettings?.fontFamilies ?? DEFAULT_FONT_FAMILIES
)
const sortedFontFamilies = computed(() => {
  const base = fontFamilies.value
  const extras = [
    store.userSettings?.chosenHeadingFont,
    store.userSettings?.chosenBodyFont
  ].filter((f): f is string => !!f && !base.includes(f))
  return [...base, ...extras].sort((a, b) => a.localeCompare(b))
})
const fontSizes = Array.from({ length: 7 }, (_, i) => `${9 + i * 2}pt`)

const headingFont = computed({
  get: () => store.userSettings?.chosenHeadingFont,
  set: (value) => store.setHeadingFont(value!)
})
const bodyFont = computed({
  get: () => store.userSettings?.chosenBodyFont,
  set: (value) => store.setBodyFont(value!)
})
const fontSize = computed({
  get: () => store.userSettings?.chosenFontSize,
  set: (value) => store.setFontSize(value!)
})
</script>

<template>
  <div class="font-change">
    <div>
      <label for="heading-font" class="font-label">h</label>
      <select id="heading-font" class="select" v-model="headingFont">
        <option v-for="font in sortedFontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>

      <button
        type="button"
        class="btn btn-ghost btn-sm btn-circle"
        aria-label="Swap heading and paragraph fonts"
        @click="store.swapFonts()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M7 10h14l-4 -4" />
          <path d="M17 14h-14l4 4" />
        </svg>
      </button>

      <label for="body-font" class="font-label">p</label>
      <select id="body-font" class="select" v-model="bodyFont">
        <option v-for="font in sortedFontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>
    </div>
    <div>
      <theme-swap />

      <label for="font-size" class="font-label">s</label>
      <select id="font-size" class="select" v-model="fontSize">
        <option v-for="size in fontSizes" :key="size" :value="size">
          {{ size }}
        </option>
      </select>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.font-change {
  select {
    flex: 1;
    display: flex;
  }

  div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 1rem;
  }
}

.font-label {
  font-weight: bold;
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>

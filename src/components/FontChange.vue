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
    store.userSettings?.chosenTitleFont,
    store.userSettings?.chosenBodyFont
  ].filter((f): f is string => !!f && !base.includes(f))
  return [...base, ...extras].sort((a, b) => a.localeCompare(b))
})
const fontSizes = Array.from({ length: 7 }, (_, i) => `${9 + i * 2}pt`)

const titleFont = computed({
  get: () => store.userSettings?.chosenTitleFont,
  set: (value) => store.setTitleFont(value!)
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
      <label for="title-font" class="font-label">t</label>
      <select
        id="title-font"
        class="select"
        v-model="titleFont"
      >
        <option v-for="font in sortedFontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>

      <label for="body-font" class="font-label">p</label>
      <select
        id="body-font"
        class="select"
        v-model="bodyFont"
      >
        <option v-for="font in sortedFontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>
    </div>
    <div>
      <theme-swap />

      <label for="font-size" class="font-label">s</label>
      <select
        id="font-size"
        class="select"
        v-model="fontSize"
      >
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

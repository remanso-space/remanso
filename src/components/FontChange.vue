<script setup lang="ts">
import { computed, ref } from "vue"

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

// false → the dropdown edits the heading font, true → the paragraph font.
const editingBody = ref(false)
const activeFont = computed({
  get: () =>
    editingBody.value
      ? store.userSettings?.chosenBodyFont
      : store.userSettings?.chosenHeadingFont,
  set: (value) =>
    editingBody.value ? store.setBodyFont(value!) : store.setHeadingFont(value!)
})
const fontSize = computed({
  get: () => store.userSettings?.chosenFontSize,
  set: (value) => store.setFontSize(value!)
})
</script>

<template>
  <div class="font-change">
    <div>
      <label class="font-toggle">
        <span class="font-label" :class="{ active: !editingBody }">h</span>
        <input
          type="checkbox"
          class="toggle toggle-sm"
          v-model="editingBody"
          aria-label="Switch between heading and paragraph font"
        />
        <span class="font-label" :class="{ active: editingBody }">p</span>
      </label>
      <select
        id="font-target"
        class="select"
        v-model="activeFont"
        :aria-label="editingBody ? 'Paragraph font' : 'Heading font'"
      >
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

.font-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  .font-label.active {
    opacity: 1;
  }
}

.font-label {
  font-weight: bold;
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>

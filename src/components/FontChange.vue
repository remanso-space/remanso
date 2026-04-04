<script setup lang="ts">
import { computed } from "vue"

import ThemeSwap from "@/components/ThemeSwap.vue"

import { useUserRepoStore } from "../modules/repo/store/userRepo.store"

const store = useUserRepoStore()

const fontFamilies = computed(() => store.userSettings?.fontFamilies ?? [])
const sortedFontFamilies = computed(() =>
  [...fontFamilies.value].sort((a, b) => a.localeCompare(b))
)
const fontSizes = Array.from({ length: 7 }, (_, i) => `${9 + i * 2}pt`)
</script>

<template>
  <div class="font-change">
    <div v-if="sortedFontFamilies.length > 0">
      <label for="title-font" class="font-label">t</label>
      <select
        id="title-font"
        class="select"
        :value="store.userSettings?.chosenTitleFont"
        @change="store.setTitleFont(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="font in sortedFontFamilies" :key="font" :value="font">
          {{ font }}
        </option>
      </select>

      <label for="body-font" class="font-label">p</label>
      <select
        id="body-font"
        class="select"
        :value="store.userSettings?.chosenBodyFont"
        @change="store.setBodyFont(($event.target as HTMLSelectElement).value)"
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
        :value="store.userSettings?.chosenFontSize"
        @change="store.setFontSize(($event.target as HTMLSelectElement).value)"
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

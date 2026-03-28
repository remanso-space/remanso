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
  <div class="font-change" v-if="sortedFontFamilies.length > 0">
    <theme-swap />

    <select
      class="select"
      :value="store.userSettings?.chosenFontFamily"
      @change="store.setFontFamily(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="font in sortedFontFamilies" :key="font" :value="font">
        {{ font }}
      </option>
    </select>

    <select
      class="select"
      :value="store.userSettings?.chosenFontSize"
      @change="store.setFontSize(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="size in fontSizes" :key="size" :value="size">
        {{ size }}
      </option>
    </select>
  </div>
</template>

<style lang="scss" scoped>
.font-change {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;

  select {
    flex: 1;
    display: flex;
  }
}
</style>

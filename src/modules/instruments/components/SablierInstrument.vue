<script setup lang="ts">
import { computed, ref } from "vue"

import type { InstrumentTable } from "../runInstruments"
import { countAt, formatCount, parseGrains, parseSablierArgs } from "../sablier"

const props = defineProps<{
  args: string
  name: string
  table?: InstrumentTable
}>()

const { daysLeft } = parseSablierArgs(props.args)
// Coarse (few, big grains) on the left, fine (many, small grains) on the right.
const grains = parseGrains(props.table)

const position = ref(0)
const grain = computed(() => grains[position.value])
const count = computed(() => countAt(daysLeft, grain.value))
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <label class="block">
      <span class="flex justify-between text-sm text-base-content/60">
        <span>How finely you count</span>
        <span class="sablier-grain text-(--link-accent)">{{
          grain.label
        }}</span>
      </span>
      <input
        v-model.number="position"
        type="range"
        class="range range-xs"
        min="0"
        :max="grains.length - 1"
        step="1"
        aria-label="How finely you count the time left"
      />
    </label>

    <div class="mt-4 text-center">
      <div
        class="sablier-count font-mono text-4xl font-bold tabular-nums text-(--link-accent)"
      >
        {{ formatCount(count) }}
      </div>
      <div class="mt-1 text-sm text-base-content/60">
        {{ count === 1 ? "grain left" : "grains left" }}
      </div>
    </div>

    <!-- The stock. Constant, whatever the slider does: only the count moves. -->
    <div class="mt-4">
      <div class="mb-1 text-xs text-base-content/60">Time left</div>
      <div class="h-3 w-full overflow-hidden rounded-full bg-base-300">
        <div
          class="sablier-bar h-full w-full bg-(--link-accent)"
          style="opacity: 0.55"
        ></div>
      </div>
    </div>

    <p class="mt-3 text-sm text-base-content/60">
      The stock never moved — only the grain you dared to count it at.
    </p>
  </div>
</template>

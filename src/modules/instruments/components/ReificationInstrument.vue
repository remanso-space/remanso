<script setup lang="ts">
import { computed, ref, watch } from "vue"

import {
  formatMiles,
  parseStages,
  sliderToMiles,
  stageIndexAt
} from "../reification"
import { consumeRows, type InstrumentProps } from "../sibling"

const props = defineProps<InstrumentProps>()

const table = consumeRows(props.sibling)

const stages = parseStages(table)

const position = ref(0)
const miles = computed(() => sliderToMiles(position.value))
const index = computed(() => stageIndexAt(stages, miles.value))

// Reification is one-way: every stage left behind stays behind, whatever the
// slider does afterwards.
const furthest = ref(0)
watch(index, (value) => {
  if (value > furthest.value) furthest.value = value
})

const current = computed(() => stages[index.value])
const lost = computed(() => stages.slice(0, furthest.value))

const reset = () => {
  position.value = 0
  furthest.value = 0
}
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <label class="block">
      <span class="flex justify-between text-sm text-base-content/60">
        <span>Distance from the row</span>
        <span class="reification-miles tabular-nums">
          {{ formatMiles(miles) }}
        </span>
      </span>
      <input
        v-model.number="position"
        type="range"
        class="range range-xs"
        min="0"
        max="100"
        step="1"
        aria-label="Distance between the owner and the cotton row"
      />
    </label>

    <p class="reification-current mt-3 text-base">{{ current.text }}</p>

    <template v-if="lost.length > 0">
      <p class="mt-4 text-xs text-base-content/60">Lost between the lines</p>
      <ul class="reification-lost mt-1 space-y-1">
        <li
          v-for="stage in lost"
          :key="stage.miles"
          class="text-sm text-base-content/40 line-through"
        >
          {{ stage.text }}
        </li>
      </ul>
      <p class="mt-2 text-sm text-base-content/60">
        Coming back does not bring her back.
      </p>
      <div class="mt-3 flex justify-center">
        <button class="btn btn-ghost btn-sm" @click="reset">Again</button>
      </div>
    </template>
  </div>
</template>

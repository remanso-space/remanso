<script setup lang="ts">
import { computed, ref } from "vue"

import {
  clampLens,
  formatLives,
  isCounted,
  LENSES,
  parseEvents,
  tallyAt
} from "../namingFilter"
import { consumeRows, type InstrumentProps } from "../sibling"

const props = defineProps<InstrumentProps>()

const table = consumeRows(props.sibling)

const events = parseEvents(table)

const position = ref(0)
const lensIndex = computed(() => clampLens(position.value))
const lens = computed(() => LENSES[lensIndex.value])
const tally = computed(() => tallyAt(events, lensIndex.value))
const counted = (index: number) => isCounted(events[index], lensIndex.value)

const closing = computed(() => {
  if (lensIndex.value === 0) {
    return "There is no worse hypocrisy than to call violence only this one."
  }
  if (lensIndex.value === LENSES.length - 1) {
    return "The word now covers the first violence, which makes the others."
  }
  return "Widening the word does not add any deaths. It stops hiding them."
})
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <label class="block">
      <span class="flex justify-between text-sm text-base-content/60">
        <span>What you call violence</span>
        <span class="filter-lens">{{ lens.label }}</span>
      </span>
      <input
        v-model.number="position"
        type="range"
        class="range range-xs"
        min="0"
        :max="LENSES.length - 1"
        step="1"
        aria-label="How wide the word violence is drawn"
      />
    </label>

    <p class="filter-tally mt-3 text-sm">
      Called violence:
      <span class="font-bold tabular-nums text-error">{{ tally.events }}</span>
      of <span class="tabular-nums">{{ tally.totalEvents }}</span> events ·
      <span class="font-bold tabular-nums text-error">
        {{ formatLives(tally.lives) }}
      </span>
      of <span class="tabular-nums">{{ formatLives(tally.totalLives) }}</span>
      lives.
    </p>

    <ul class="filter-events mt-3 space-y-1">
      <li
        v-for="(event, index) in events"
        :key="event.text"
        class="flex items-baseline justify-between gap-2 text-sm"
        :class="
          counted(index)
            ? 'filter-counted'
            : 'filter-uncounted text-base-content/30'
        "
      >
        <span>{{ event.text }}</span>
        <span
          class="shrink-0 tabular-nums"
          :class="counted(index) ? 'font-bold text-error' : ''"
        >
          {{ formatLives(event.lives) }}
        </span>
      </li>
    </ul>

    <p class="filter-closing mt-3 text-sm text-base-content/60">
      {{ closing }}
    </p>
  </div>
</template>

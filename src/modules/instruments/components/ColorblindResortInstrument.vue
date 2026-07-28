<script setup lang="ts">
import { computed, ref } from "vue"

import { countSorted, parseCases } from "../colorblindResort"
import type { InstrumentTable } from "../runInstruments"

const props = defineProps<{
  args: string
  name: string
  table?: InstrumentTable
}>()

const cases = parseCases(props.table)
const tally = countSorted(cases)

const colorblind = ref(false)

const closing = computed(() =>
  colorblind.value
    ? "You removed the only word that explained the split. The split didn't move. Refusing to name colour doesn't unsort anyone."
    : "The word names the split. Now take it away."
)
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <label class="flex cursor-pointer items-center gap-2 text-sm">
      <input
        v-model="colorblind"
        type="checkbox"
        class="toggle toggle-sm"
        aria-label="Stop looking at colour"
      />
      <span>Stop looking at colour</span>
    </label>

    <ul class="resort-cases mt-3 space-y-1">
      <li
        v-for="(item, index) in cases"
        :key="index"
        class="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-sm"
      >
        <span>{{ item.person }}</span>
        <span
          class="resort-color shrink-0 tabular-nums"
          :class="colorblind ? 'text-base-content/30' : 'text-base-content/60'"
        >
          {{ colorblind ? "—" : item.color }}
        </span>
        <span class="text-right font-semibold text-error">
          {{ item.destination }}
        </span>
      </li>
    </ul>

    <p class="resort-tally mt-3 border-t border-base-300 pt-3 text-sm">
      Colour {{ colorblind ? "hidden" : "named" }}:
      <span class="font-bold tabular-nums text-error">{{ tally.split }}</span>
      of <span class="tabular-nums">{{ tally.total }}</span> still sorted.
    </p>

    <p class="resort-closing mt-2 text-sm text-base-content/60">
      {{ closing }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import {
  coincidenceProbability,
  CREDIBLE_THRESHOLD,
  formatPercent,
  type Institution,
  parseInstitutions
} from "../coincidenceStack"
import type { InstrumentTable } from "../runInstruments"

const props = defineProps<{
  args: string
  name: string
  table?: InstrumentTable
}>()

const institutions = parseInstitutions(props.table)
const counted = ref<boolean[]>(institutions.map(() => false))

const countedInstitutions = computed<Institution[]>(() =>
  institutions.filter((_, index) => counted.value[index])
)
const probability = computed(() =>
  countedInstitutions.value.length === 0
    ? null
    : coincidenceProbability(countedInstitutions.value)
)
const isError = computed(
  () => probability.value !== null && probability.value < CREDIBLE_THRESHOLD
)

const closing = computed(() => {
  const count = countedInstitutions.value.length
  if (count === 0) {
    return "Count one institution. Alone, its outcome is a coincidence you can grant."
  }
  if (count === 1) {
    return "One institution. Still deniable — maybe this one isn't about colour."
  }
  if (isError.value) {
    return "Every institution independently, all sorting the same way. The innocence you'd have to believe is a rounding error — that is why you come back to colour."
  }
  return "Each institution halves the innocence left to believe in. Keep counting."
})
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <p class="text-sm text-base-content/60">
      Grant each the benefit of the doubt. Count them together.
    </p>

    <ul class="stack-institutions mt-3 space-y-1">
      <li
        v-for="(institution, index) in institutions"
        :key="institution.name"
        class="flex items-baseline gap-2 text-sm"
      >
        <input
          v-model="counted[index]"
          type="checkbox"
          class="checkbox checkbox-xs shrink-0 self-center"
          :aria-label="`Count ${institution.name}`"
        />
        <span class="grow">
          <span class="font-semibold">{{ institution.name }}</span>
          <span class="text-base-content/50"> — {{ institution.outcome }}</span>
        </span>
        <span class="shrink-0 tabular-nums text-base-content/40">
          {{ formatPercent(institution.doubt) }}
        </span>
      </li>
    </ul>

    <p class="stack-probability mt-3 border-t border-base-300 pt-3 text-sm">
      <template v-if="probability === null">
        <span class="text-base-content/60">Nothing ruled out yet.</span>
      </template>
      <template v-else>
        Chance it's all just coincidence:
        <span
          class="text-lg font-bold tabular-nums"
          :class="isError ? 'text-error' : 'text-(--link-accent)'"
        >
          {{ formatPercent(probability) }}
        </span>
      </template>
    </p>

    <p class="stack-closing mt-2 text-sm text-base-content/60">
      {{ closing }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import {
  applyDay,
  initialRatchetState,
  isFinished,
  parseRatchetArgs
} from "../quotaRatchet"

const props = defineProps<{ args: string; name: string }>()

const params = parseRatchetArgs(props.args)

const state = ref(initialRatchetState(params))
const picked = ref(params.target)

const finished = computed(() => isFinished(state.value))
const sliderMax = computed(() => Math.round(state.value.target * 2))

const dayLabel = computed(
  () => `Day ${state.value.day} of ${params.days}`
)

const consequence = (entry: (typeof state.value.log)[number]): string => {
  if (entry.picked > entry.target) return `target raised to ${entry.nextTarget}`
  if (entry.picked < entry.target) {
    return `${entry.lashes} lashes · no rations`
  }
  return "held"
}

const log = () => {
  state.value = applyDay(state.value, picked.value)
  picked.value = state.value.target
}

const restart = () => {
  state.value = initialRatchetState(params)
  picked.value = params.target
}
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <template v-if="!finished">
      <div class="flex items-center justify-between text-sm">
        <span class="ratchet-day text-base-content/60">{{ dayLabel }}</span>
        <span class="ratchet-target tabular-nums">
          today's target
          <span class="text-(--link-accent)">{{ state.target }}</span> lb
        </span>
      </div>

      <label class="mt-3 block">
        <span class="flex justify-between text-sm text-base-content/60">
          <span>Picked</span>
          <span class="ratchet-picked tabular-nums">{{ picked }} lb</span>
        </span>
        <input
          v-model.number="picked"
          type="range"
          class="range range-xs"
          min="0"
          :max="sliderMax"
          step="1"
          aria-label="Pounds of cotton picked today"
        />
      </label>

      <div class="mt-3 flex justify-center">
        <button class="btn btn-sm" @click="log">Log the day</button>
      </div>
    </template>

    <template v-else>
      <p class="ratchet-summary">
        <span class="tabular-nums">{{ params.target }}</span> →
        <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
          {{ state.target }}
        </span>
        lb · <span class="tabular-nums">{{ state.lashes }}</span> lashes ·
        <span class="tabular-nums">{{ state.daysWithoutRations }}</span> days
        without rations
      </p>
      <p class="mt-1 text-sm text-base-content/60">
        Too much became tomorrow's target. Too little was paid for by the pound.
      </p>
      <div class="mt-3 flex justify-center">
        <button class="btn btn-sm" @click="restart">Again</button>
      </div>
    </template>

    <table v-if="state.log.length > 0" class="ratchet-log mt-3 w-full text-sm">
      <thead>
        <tr class="text-base-content/60">
          <th class="text-left font-normal">Day</th>
          <th class="text-right font-normal">Target</th>
          <th class="text-right font-normal">Picked</th>
          <th class="text-right font-normal">Consequence</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in state.log" :key="entry.day">
          <td class="py-0.5 tabular-nums">{{ entry.day }}</td>
          <td class="py-0.5 text-right tabular-nums">{{ entry.target }}</td>
          <td class="py-0.5 text-right tabular-nums">{{ entry.picked }}</td>
          <td class="py-0.5 text-right text-base-content/80">
            {{ consequence(entry) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

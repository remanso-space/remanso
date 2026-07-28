<script setup lang="ts">
import { computed, ref } from "vue"

import { formatSeconds, parseDuration } from "../duration"
import type { InstrumentProps } from "../sibling"

const props = defineProps<InstrumentProps>()

// Demand first, then available time — the order the lean question is asked:
// "22 products in 480 minutes".
const parseArgs = (
  args: string
): { duration: string; demand: number } | null => {
  const parts = args.split("/")
  if (parts.length !== 2) return null
  const demandText = parts[0].trim()
  const duration = parts[1].trim()
  if (parseDuration(duration) === null) return null
  if (!/^\d+$/.test(demandText) || Number(demandText) < 1) return null
  return { duration, demand: Number(demandText) }
}

const initial = parseArgs(props.args)
const durationInput = ref(initial?.duration ?? "")
const demandInput = ref<number | string>(initial?.demand ?? "")

const availableSeconds = computed(() => parseDuration(durationInput.value))
const demand = computed(() => {
  const value = Number(demandInput.value)
  return Number.isInteger(value) && value >= 1 ? value : null
})

const taktSeconds = computed(() => {
  if (availableSeconds.value === null || demand.value === null) return null
  return Math.round(availableSeconds.value / demand.value)
})

// takt-time = time to ship one unit; takt = the inverse rate (units per hour).
const isRate = computed(() => props.name === "takt")

const ratePerHour = computed(() => {
  if (availableSeconds.value === null || demand.value === null) return null
  const rate = demand.value / (availableSeconds.value / 3600)
  return Math.round(rate * 100) / 100
})
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-fit rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex items-center gap-2">
      <input
        v-model.number="demandInput"
        type="number"
        min="1"
        class="input input-sm w-20"
        placeholder="22"
        aria-label="Demand"
      />
      <span class="text-sm opacity-60">/</span>
      <input
        v-model="durationInput"
        type="text"
        class="input input-sm w-24"
        placeholder="480m"
        aria-label="Available time"
      />
    </div>
    <template v-if="taktSeconds !== null">
      <div class="mt-2 flex items-baseline gap-2">
        <template v-if="isRate">
          <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
            {{ ratePerHour }}
          </span>
          <span class="text-sm opacity-60">units / hour</span>
        </template>
        <template v-else>
          <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
            {{ formatSeconds(taktSeconds) }}
          </span>
          <span class="text-sm opacity-60">per unit</span>
        </template>
      </div>
      <p class="mt-1 text-xs opacity-60">{{ demand }} / {{ durationInput }}</p>
    </template>
    <p v-else class="mt-2 text-xs opacity-60">
      expected :::{{ name }} 22 / 480m:::
    </p>
  </div>
</template>

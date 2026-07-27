<script setup lang="ts">
import { computed, ref } from "vue"

import {
  cycleTime,
  parseKingmanArgs,
  utilizationFactor,
  variabilityFactor,
  waitTime,
  wip
} from "../kingman"

const props = defineProps<{ args: string; name: string }>()

const initial = parseKingmanArgs(props.args)

// Service time is fixed at 1: every time below is a multiple of "how long the
// work itself takes". τ only rescales the clock — it leaves the counts and the
// curve untouched — so exposing it as a slider just reads as a dead control.
const SERVICE_TIME = 1

// Sliders hold utilization as a percentage; the rest as their natural values.
const utilizationPct = ref(Math.round(initial.utilization * 100))
const ca = ref(initial.ca)
const cs = ref(initial.cs)

const params = computed(() => ({
  utilization: Math.min(0.999, Math.max(0, utilizationPct.value / 100)),
  ca: ca.value,
  cs: cs.value,
  serviceTime: SERVICE_TIME
}))

const round1 = (value: number): string =>
  (Math.round(value * 10) / 10).toLocaleString("en-US")

const wait = computed(() => waitTime(params.value))
const cycle = computed(() => cycleTime(params.value))
const workInProgress = computed(() => wip(params.value))

const vFactor = computed(() => variabilityFactor(params.value))
const uFactor = computed(() => utilizationFactor(params.value))

const sliders = computed(() => [
  {
    label: "Utilization ρ",
    hint: "how busy the server is",
    model: utilizationPct,
    min: 0,
    max: 99,
    step: 1
  },
  {
    label: "Arrival variability Ca",
    hint: "how bursty the arrivals are",
    model: ca,
    min: 0,
    max: 3,
    step: 0.1
  },
  {
    label: "Service variability Cs",
    hint: "how uneven the work is",
    model: cs,
    min: 0,
    max: 3,
    step: 0.1
  }
])

const displayValue = (label: string, value: number): string =>
  label === "Utilization ρ" ? `${value}%` : round1(value)

// Cycle-time-vs-utilization curve, plotted as a multiple of service time so it
// is unit-free. The y-axis ceiling is FIXED: variability visibly lifts the
// whole curve, and ρ walks the point up the wall toward infinity at 100%.
const CURVE_MAX_U = 0.98
const Y_MAX = 10
const WIDTH = 320
const HEIGHT = 120

const chart = computed(() => {
  const v = vFactor.value
  const multAt = (u: number): number => 1 + v * (u / (1 - u))

  const x = (u: number): number => (u / CURVE_MAX_U) * WIDTH
  const y = (mult: number): number =>
    HEIGHT - (Math.min(mult, Y_MAX) / Y_MAX) * HEIGHT

  const steps = 80
  const path = Array.from({ length: steps + 1 }, (_, index) => {
    const u = (index / steps) * CURVE_MAX_U
    return `${index === 0 ? "M" : "L"}${x(u).toFixed(1)},${y(multAt(u)).toFixed(1)}`
  }).join(" ")

  const currentMult = multAt(params.value.utilization)
  return {
    path,
    floorY: y(1),
    point: {
      cx: x(Math.min(params.value.utilization, CURVE_MAX_U)),
      cy: Math.max(4, y(currentMult))
    },
    offScale: currentMult > Y_MAX
  }
})
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex flex-col gap-2">
      <label
        v-for="slider in sliders"
        :key="slider.label"
        class="flex flex-col gap-0.5"
      >
        <span class="flex justify-between text-sm text-base-content/60">
          <span>{{ slider.label }}</span>
          <span class="tabular-nums">
            {{ displayValue(slider.label, slider.model.value) }}
          </span>
        </span>
        <input
          v-model.number="slider.model.value"
          type="range"
          class="range range-xs w-full"
          :min="slider.min"
          :max="slider.max"
          :step="slider.step"
          :aria-label="slider.label"
        />
        <span class="text-xs opacity-50">{{ slider.hint }}</span>
      </label>
    </div>

    <div class="mt-3 flex items-baseline gap-2">
      <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
        {{ round1(cycle) }}×
      </span>
      <span class="text-sm opacity-60">cycle time</span>
    </div>
    <p class="mt-1 text-sm text-base-content/60">
      1× doing the work +
      <span class="tabular-nums">{{ round1(wait) }}×</span> waiting in the queue
      <span class="opacity-70">(multiples of service time)</span>
    </p>

    <p class="mt-2 text-sm text-base-content/60">
      Little's Law →
      <span class="font-mono tabular-nums text-(--link-accent)">
        {{ round1(workInProgress) }}
      </span>
      items in progress (throughput {{ round1(params.utilization) }} × cycle time
      {{ round1(cycle) }})
    </p>

    <svg
      class="mt-3 w-full"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      aria-label="Cycle time as a multiple of service time versus utilization"
    >
      <line
        x1="0"
        :y1="chart.floorY"
        :x2="WIDTH"
        :y2="chart.floorY"
        stroke="var(--color-base-300)"
        stroke-width="1"
        stroke-dasharray="3 3"
      />
      <path
        :d="chart.path"
        fill="none"
        stroke="var(--link-accent)"
        stroke-width="2"
      />
      <circle
        :cx="chart.point.cx"
        :cy="chart.point.cy"
        r="4"
        fill="var(--color-warning)"
      />
    </svg>
    <p class="mt-1 text-center text-xs opacity-60">
      cycle time (× service time) as utilization ρ rises to 100%<span
        v-if="chart.offScale"
      >
        — off the top of the chart</span
      >
    </p>
  </div>
</template>

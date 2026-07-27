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

// Sliders hold utilization as a percentage; the rest as their natural values.
const utilizationPct = ref(Math.round(initial.utilization * 100))
const ca = ref(initial.ca)
const cs = ref(initial.cs)
const serviceTime = ref(initial.serviceTime)

const params = computed(() => ({
  utilization: Math.min(0.999, Math.max(0, utilizationPct.value / 100)),
  ca: ca.value,
  cs: cs.value,
  serviceTime: serviceTime.value
}))

const round1 = (value: number): string =>
  (Math.round(value * 10) / 10).toLocaleString("en-US")

const wait = computed(() => waitTime(params.value))
const cycle = computed(() => cycleTime(params.value))
const workInProgress = computed(() => wip(params.value))

const vFactor = computed(() => variabilityFactor(params.value))
const uFactor = computed(() => utilizationFactor(params.value))

const sliders = computed(() => [
  { label: "Utilization ρ", model: utilizationPct, min: 0, max: 99, step: 1 },
  { label: "Arrival variability Ca", model: ca, min: 0, max: 3, step: 0.1 },
  { label: "Service variability Cs", model: cs, min: 0, max: 3, step: 0.1 },
  { label: "Service time τ", model: serviceTime, min: 1, max: 60, step: 1 }
])

const displayValue = (label: string, value: number): string =>
  label === "Utilization ρ" ? `${value}%` : round1(value)

// Cycle-time-vs-utilization curve: the ρ/(1−ρ) blow-up made visible. Keep the
// current variability, sweep ρ, and clamp the y-axis so the point stays on
// screen even as the curve shoots off the top near ρ = 1.
const CURVE_MAX_U = 0.98
const WIDTH = 320
const HEIGHT = 120

const chart = computed(() => {
  const v = vFactor.value
  const tau = params.value.serviceTime
  const ctAt = (u: number): number => (1 + v * (u / (1 - u))) * tau
  const yMax = Math.max(ctAt(0.9), cycle.value * 1.15, tau * 2)

  const x = (u: number): number => (u / CURVE_MAX_U) * WIDTH
  const y = (ct: number): number => HEIGHT - (Math.min(ct, yMax) / yMax) * HEIGHT

  const steps = 80
  const path = Array.from({ length: steps + 1 }, (_, index) => {
    const u = (index / steps) * CURVE_MAX_U
    return `${index === 0 ? "M" : "L"}${x(u).toFixed(1)},${y(ctAt(u)).toFixed(1)}`
  }).join(" ")

  return {
    path,
    point: { cx: x(params.value.utilization), cy: y(cycle.value) }
  }
})
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex flex-col gap-2">
      <label v-for="slider in sliders" :key="slider.label" class="block">
        <span class="flex justify-between text-sm text-base-content/60">
          <span>{{ slider.label }}</span>
          <span class="tabular-nums">
            {{ displayValue(slider.label, slider.model.value) }}
          </span>
        </span>
        <input
          v-model.number="slider.model.value"
          type="range"
          class="range range-xs"
          :min="slider.min"
          :max="slider.max"
          :step="slider.step"
          :aria-label="slider.label"
        />
      </label>
    </div>

    <div class="mt-3 flex items-baseline gap-2">
      <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
        {{ round1(workInProgress) }}
      </span>
      <span class="text-sm opacity-60">items in progress</span>
    </div>
    <p class="mt-1 text-sm text-base-content/60">
      Little's Law: WIP = throughput × cycle time =
      {{ round1(params.utilization / params.serviceTime) }} ×
      {{ round1(cycle) }}
    </p>

    <p class="mt-2 text-xs text-base-content/60">
      Kingman Wq ≈ V·U·τ = {{ round1(vFactor) }} · {{ round1(uFactor) }} ·
      {{ round1(params.serviceTime) }} =
      <span class="tabular-nums">{{ round1(wait) }}</span> wait,
      <span class="tabular-nums">{{ round1(cycle) }}</span> cycle time
    </p>

    <svg
      class="mt-3 w-full"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      aria-label="Cycle time versus utilization, exploding near 100%"
    >
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
      cycle time as utilization ρ rises to 100%
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import { parseBayesArgs, population, posterior } from "../bayes"
import type { InstrumentProps } from "../sibling"

const props = defineProps<InstrumentProps>()

const COLUMNS = 40
const ROWS = 25
const TOTAL = COLUMNS * ROWS
const SPACING = 8
const RADIUS = 3

const parsed = parseBayesArgs(props.args)

const priorPct = ref(Math.min(100, Math.max(0.1, parsed.prior * 100)))
const sensitivityPct = ref(Math.min(100, Math.max(1, parsed.sensitivity * 100)))
const fprPct = ref(Math.min(100, Math.max(0, parsed.fpr * 100)))

const params = computed(() => ({
  prior: priorPct.value / 100,
  sensitivity: sensitivityPct.value / 100,
  fpr: fprPct.value / 100
}))

const posteriorValue = computed(() => posterior(params.value))
const counts = computed(() => population(params.value, TOTAL))

const formatPct = (value: number): string =>
  `${(Math.round(value * 10) / 10).toString()}%`

const posteriorPct = computed(() => formatPct(posteriorValue.value * 100))

type DotKind = "tp" | "fp" | "fn" | "tn"

const DOT_STYLE: Record<
  DotKind,
  { fill: string; stroke?: string; strokeWidth?: number }
> = {
  tp: { fill: "var(--link-accent)" },
  fp: { fill: "var(--color-warning)" },
  fn: { fill: "none", stroke: "var(--link-accent)", strokeWidth: 1 },
  tn: { fill: "var(--color-base-300)" }
}

const dots = computed(() => {
  const { tp, fp, fn } = counts.value
  return Array.from({ length: TOTAL }, (_, i) => {
    const kind: DotKind =
      i < tp ? "tp" : i < tp + fp ? "fp" : i < tp + fp + fn ? "fn" : "tn"
    return {
      cx: (i % COLUMNS) * SPACING + SPACING / 2,
      cy: Math.floor(i / COLUMNS) * SPACING + SPACING / 2,
      ...DOT_STYLE[kind]
    }
  })
})

const sliders = computed(() => [
  {
    label: "Prior",
    model: priorPct,
    min: 0.1,
    max: 100,
    step: 0.1
  },
  {
    label: "Sensitivity",
    model: sensitivityPct,
    min: 1,
    max: 100,
    step: 1
  },
  {
    label: "False positive rate",
    model: fprPct,
    min: 0,
    max: 100,
    step: 0.5
  }
])
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex flex-col gap-2">
      <label v-for="slider in sliders" :key="slider.label" class="block">
        <span class="flex justify-between text-sm text-base-content/60">
          <span>{{ slider.label }}</span>
          <span class="tabular-nums">{{ formatPct(slider.model.value) }}</span>
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

    <p class="mt-3">
      P(condition | positive test) ≈
      <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
        {{ posteriorPct }}
      </span>
    </p>
    <p class="text-sm text-base-content/60">
      Of all positive tests, only the accent share is real.
    </p>

    <svg
      class="mt-3 w-full"
      :viewBox="`0 0 ${COLUMNS * SPACING} ${ROWS * SPACING}`"
      role="img"
      aria-label="Population of 1000 people split by condition and test result"
    >
      <circle
        v-for="(dot, index) in dots"
        :key="index"
        :cx="dot.cx"
        :cy="dot.cy"
        :r="RADIUS"
        :fill="dot.fill"
        :stroke="dot.stroke"
        :stroke-width="dot.strokeWidth"
      />
    </svg>

    <ul
      class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/60"
    >
      <li class="flex items-center gap-1">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background: var(--link-accent)"
        ></span>
        sick + positive
      </li>
      <li class="flex items-center gap-1">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background: var(--color-warning)"
        ></span>
        healthy + positive (false alarm)
      </li>
      <li class="flex items-center gap-1">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full border"
          style="border-color: var(--link-accent)"
        ></span>
        sick + negative (missed)
      </li>
      <li class="flex items-center gap-1">
        <span
          class="inline-block h-2.5 w-2.5 rounded-full"
          style="background: var(--color-base-300)"
        ></span>
        healthy + negative
      </li>
    </ul>
  </div>
</template>

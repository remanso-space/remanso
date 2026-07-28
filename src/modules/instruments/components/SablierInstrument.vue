<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue"

import type { InstrumentTable } from "../runInstruments"
import {
  countAt,
  formatCount,
  parseGrains,
  parseSablierArgs,
  visibleDots
} from "../sablier"

const props = defineProps<{
  args: string
  name: string
  table?: InstrumentTable
}>()

const { daysLeft } = parseSablierArgs(props.args)
// Coarse (few, big grains) first, fine (many, small grains) last.
const grains = parseGrains(props.table)
const maxLevel = grains.length - 1

const level = ref(0)
const grain = computed(() => grains[level.value])
const count = computed(() => countAt(daysLeft, grain.value))
const dots = computed(() => visibleDots(count.value))
const cols = computed(() => Math.max(1, Math.ceil(Math.sqrt(dots.value))))

// A square grid of grains laid inside the lens (viewBox 0 0 200 200, lens
// centred at 100,100). Finer grains pack more, smaller points — the swarm.
const SIDE = 128
const points = computed(() => {
  const n = dots.value
  const c = cols.value
  const gap = SIDE / c
  const start = 100 - SIDE / 2 + gap / 2
  const r = Math.max(0.9, Math.min(gap * 0.32, 7))
  return Array.from({ length: n }, (_, i) => ({
    x: start + (i % c) * gap,
    y: start + Math.floor(i / c) * gap,
    r
  }))
})

const capped = computed(() => count.value > dots.value)

const zoomIn = () => {
  if (level.value < maxLevel) level.value++
}
const zoomOut = () => {
  if (level.value > 0) level.value--
}

// Play ping-pongs the zoom so the dive runs on its own — the animation, hands
// off. Camera only: the stock never drains, so nothing dishonest accumulates.
const playing = ref(false)
let dir = 1
let intervalId: number | undefined

const stop = () => {
  window.clearInterval(intervalId)
  intervalId = undefined
  playing.value = false
}

const play = () => {
  if (playing.value) {
    stop()
    return
  }
  playing.value = true
  intervalId = window.setInterval(() => {
    if (level.value >= maxLevel) dir = -1
    else if (level.value <= 0) dir = 1
    level.value += dir
  }, 1400)
}

onUnmounted(() => window.clearInterval(intervalId))
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm text-base-content/60">How finely you count</span>
      <span class="sablier-grain font-medium text-(--link-accent)">{{
        grain.label
      }}</span>
    </div>

    <!-- The lens onto the stock. Zooming is a camera move; the sand it holds
         never grows or drains — only the grain you resolve it into changes. -->
    <div class="relative mt-3">
      <svg viewBox="0 0 200 200" class="mx-auto block w-56 max-w-full">
        <defs>
          <clipPath id="sablier-lens">
            <circle cx="100" cy="100" r="82" />
          </clipPath>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="82"
          class="fill-base-200 stroke-base-300"
          stroke-width="2"
        />
        <g clip-path="url(#sablier-lens)">
          <!-- Keyed by level: each zoom step remounts the swarm and replays the
               CSS keyframe, so the finer grains rush in from a single point. -->
          <g :key="level" class="sablier-swarm">
            <circle
              v-for="(p, i) in points"
              :key="i"
              :cx="p.x"
              :cy="p.y"
              :r="p.r"
              class="sablier-dot fill-(--link-accent)"
              style="opacity: 0.75"
            />
          </g>
        </g>
        <circle
          cx="100"
          cy="100"
          r="82"
          fill="none"
          class="stroke-base-300"
          stroke-width="2"
        />
      </svg>
    </div>

    <div class="mt-3 text-center">
      <div
        class="sablier-count font-mono text-4xl font-bold tabular-nums text-(--link-accent)"
      >
        {{ formatCount(count) }}
      </div>
      <div class="mt-1 text-sm text-base-content/60">
        <span v-if="capped">grains left — more than the lens can hold</span>
        <span v-else>{{ count === 1 ? "grain left" : "grains left" }}</span>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-center gap-2">
      <button
        class="btn btn-ghost btn-sm text-(--link-accent)"
        title="Zoom out"
        aria-label="Zoom out"
        :disabled="level === 0"
        @click="zoomOut"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <path d="M7 10l6 0" />
          <path d="M21 21l-6 -6" />
        </svg>
      </button>

      <button
        class="btn btn-ghost btn-sm text-(--link-accent)"
        :title="playing ? 'Pause' : 'Play'"
        :aria-label="playing ? 'Pause' : 'Play'"
        @click="play"
      >
        <svg
          v-if="!playing"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M7 4v16l13 -8z" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"
          />
          <path
            d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"
          />
        </svg>
      </button>

      <button
        class="btn btn-ghost btn-sm text-(--link-accent)"
        title="Zoom in"
        aria-label="Zoom in"
        :disabled="level === maxLevel"
        @click="zoomIn"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <path d="M7 10l6 0" />
          <path d="M10 7l0 6" />
          <path d="M21 21l-6 -6" />
        </svg>
      </button>
    </div>

    <p class="mt-3 text-center text-sm text-base-content/60">
      The stock never moved — only the grain you dared to count it at.
    </p>
  </div>
</template>

<style scoped>
.sablier-swarm {
  transform-box: fill-box;
  transform-origin: center;
  animation: sablier-zoom 0.5s ease;
}

/* Each zoom step: the swarm rushes forward from a single dense point. */
@keyframes sablier-zoom {
  from {
    opacity: 0;
    transform: scale(0.35);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sablier-swarm {
    animation: none;
  }
}
</style>

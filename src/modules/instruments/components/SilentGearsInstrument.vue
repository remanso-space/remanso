<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue"

import type { InstrumentTable } from "../runInstruments"
import {
  formatCount,
  formatElapsed,
  namedTotal,
  parseGearsArgs,
  parseTolls,
  silentTotal,
  tollAt,
  unnamedPerNamed
} from "../silentGears"

const props = defineProps<{
  args: string
  name: string
  table?: InstrumentTable
}>()

const params = parseGearsArgs(props.args)
const tolls = parseTolls(props.table)
const silent = tolls.filter((toll) => !toll.named)
const named = tolls.filter((toll) => toll.named)

// 100 ms so the silent counters climb instead of stepping — a once-a-second
// jump would read as an event, and these are meant to read as a background.
const TICK_MS = 100

const days = ref(0)
const running = ref(false)

let startedAt = 0
let daysAtStart = 0
let intervalId: number | undefined

const stopTicking = () => {
  window.clearInterval(intervalId)
  intervalId = undefined
}

const tick = () => {
  const seconds = (Date.now() - startedAt) / 1000
  days.value = daysAtStart + seconds * params.daysPerSecond
}

const start = () => {
  if (running.value) return
  startedAt = Date.now()
  daysAtStart = days.value
  running.value = true
  intervalId = window.setInterval(tick, TICK_MS)
}

const pause = () => {
  running.value = false
  stopTicking()
}

const reset = () => {
  pause()
  days.value = 0
}

onUnmounted(stopTicking)

const elapsed = computed(() => formatElapsed(days.value))
const silentSum = computed(() => silentTotal(tolls, days.value))
const namedSum = computed(() => namedTotal(tolls, days.value))
const ratio = computed(() => unnamedPerNamed(tolls, days.value))
const count = (perYear: number) =>
  formatCount(tollAt({ cause: "", perYear, named: false }, days.value))
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex items-center justify-between">
      <span class="gears-elapsed text-sm text-base-content/60 tabular-nums">
        {{ elapsed }}
      </span>
      <div class="flex gap-1">
        <button
          class="btn btn-ghost btn-sm text-(--link-accent)"
          :title="running ? 'Pause' : 'Start'"
          :aria-label="running ? 'Pause' : 'Start'"
          @click="running ? pause() : start()"
        >
          <svg
            v-if="!running"
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
          title="Reset"
          aria-label="Reset"
          @click="reset"
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
            <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- No heading, no colour, no tag: the gears are unlabelled on purpose. -->
    <ul class="gears-silent mt-2 space-y-0.5">
      <li
        v-for="toll in silent"
        :key="toll.cause"
        class="flex justify-between text-sm text-base-content/50"
      >
        <span>{{ toll.cause }}</span>
        <span class="gears-count tabular-nums">{{ count(toll.perYear) }}</span>
      </li>
    </ul>

    <div
      v-for="toll in named"
      :key="toll.cause"
      class="gears-named mt-3 flex items-center justify-between rounded-box border border-(--link-accent) p-2"
    >
      <div>
        <span
          class="text-[0.65rem] font-semibold tracking-widest text-(--link-accent) uppercase"
        >
          Violence
        </span>
        <div class="text-sm">{{ toll.cause }}</div>
      </div>
      <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
        {{ count(toll.perYear) }}
      </span>
    </div>

    <p v-if="ratio !== null" class="gears-ratio mt-3 text-sm">
      <span class="tabular-nums">{{ formatCount(ratio) }}</span> dead that
      nobody calls anything, for every one that has a name.
    </p>
    <p v-else-if="silentSum > 0" class="gears-ratio mt-3 text-sm">
      <span class="tabular-nums">{{ formatCount(silentSum) }}</span> dead so
      far, and not one of them called violence.
    </p>
    <p v-if="namedSum > 0" class="mt-1 text-xs text-base-content/60">
      Only the framed counter is the one anyone argues about.
    </p>
  </div>
</template>

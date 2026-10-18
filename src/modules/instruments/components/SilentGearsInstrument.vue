<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue"

import { consumeRows, type InstrumentProps } from "../sibling"
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
import InstrumentButton from "./controls/InstrumentButton.vue"
import PauseIcon from "./controls/PauseIcon.vue"
import PlayIcon from "./controls/PlayIcon.vue"
import ResetIcon from "./controls/ResetIcon.vue"

const props = defineProps<InstrumentProps>()

const table = consumeRows(props.sibling)

const params = parseGearsArgs(props.args)
const tolls = parseTolls(table)
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
        <InstrumentButton
          :label="running ? 'Pause' : 'Start'"
          @click="running ? pause() : start()"
        >
          <PlayIcon v-if="!running" />
          <PauseIcon v-else />
        </InstrumentButton>
        <InstrumentButton label="Reset" @click="reset">
          <ResetIcon />
        </InstrumentButton>
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
      class="gears-named mt-3 flex items-center justify-between rounded-box border-2 border-error bg-error/10 p-2"
    >
      <div>
        <span
          class="text-[0.65rem] font-semibold tracking-widest text-error uppercase"
        >
          Violence
        </span>
        <div class="text-sm">{{ toll.cause }}</div>
      </div>
      <span class="font-mono text-2xl font-bold tabular-nums text-error">
        {{ count(toll.perYear) }}
      </span>
    </div>

    <p v-if="ratio !== null" class="gears-ratio mt-3 text-sm">
      <span class="gears-unnamed font-bold tabular-nums text-error">
        {{ formatCount(silentSum) }}
      </span>
      dead nobody names, against
      <span class="tabular-nums">{{ formatCount(namedSum) }}</span>
      called violence —
      <span class="gears-ratio-value tabular-nums">
        {{ formatCount(ratio) }} to 1</span
      >.
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

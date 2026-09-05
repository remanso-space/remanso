<script setup lang="ts">
import { onUnmounted, ref } from "vue"

import { formatMs } from "../duration"
import type { InstrumentProps } from "../sibling"
import InstrumentButton from "./controls/InstrumentButton.vue"
import PauseIcon from "./controls/PauseIcon.vue"
import PlayIcon from "./controls/PlayIcon.vue"
import ResetIcon from "./controls/ResetIcon.vue"

defineProps<InstrumentProps>()

const elapsed = ref(0)
const running = ref(false)
const laps = ref<{ total: number; delta: number }[]>([])

let startedAt = 0
let intervalId: number | undefined

const stopTicking = () => {
  window.clearInterval(intervalId)
  intervalId = undefined
}

const tick = () => {
  elapsed.value = Date.now() - startedAt
}

const start = () => {
  if (running.value) return
  startedAt = Date.now() - elapsed.value
  running.value = true
  intervalId = window.setInterval(tick, 100)
}

const pause = () => {
  if (!running.value) return
  tick()
  running.value = false
  stopTicking()
}

const lap = () => {
  if (running.value) tick()
  const total = elapsed.value
  const previous = laps.value.at(-1)?.total ?? 0
  laps.value.push({ total, delta: total - previous })
}

/** Back to zero, keeps running, fresh lap list. */
const restart = () => {
  laps.value = []
  elapsed.value = 0
  startedAt = Date.now()
}

const stop = () => {
  running.value = false
  stopTicking()
  elapsed.value = 0
  laps.value = []
}

onUnmounted(stopTicking)
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-fit rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex items-center gap-3">
      <span class="font-mono text-2xl tabular-nums">
        {{ formatMs(elapsed) }}
      </span>
      <div class="flex gap-1">
        <InstrumentButton
          :label="running ? 'Pause' : 'Start'"
          @click="running ? pause() : start()"
        >
          <PlayIcon v-if="!running" />
          <PauseIcon v-else />
        </InstrumentButton>
        <InstrumentButton
          label="Lap"
          :disabled="!running && elapsed === 0"
          @click="lap"
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
            <path
              d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9z"
            />
            <path d="M5 21v-7" />
          </svg>
        </InstrumentButton>
        <InstrumentButton
          label="Restart"
          :disabled="!running && elapsed === 0"
          @click="restart"
        >
          <ResetIcon />
        </InstrumentButton>
        <InstrumentButton
          label="Stop"
          :disabled="!running && elapsed === 0"
          @click="stop"
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
            <path
              d="M5 5m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"
            />
          </svg>
        </InstrumentButton>
      </div>
    </div>
    <ol v-if="laps.length" class="mt-2 text-sm font-mono tabular-nums">
      <li
        v-for="(entry, index) in laps"
        :key="index"
        class="flex gap-3 text-base-content/70"
      >
        <span class="w-8">#{{ index + 1 }}</span>
        <span>+{{ formatMs(entry.delta) }}</span>
        <span>{{ formatMs(entry.total) }}</span>
      </li>
    </ol>
  </div>
</template>

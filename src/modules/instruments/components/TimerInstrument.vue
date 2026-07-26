<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"

import { beep, primeAudio } from "../audio"
import { formatSeconds, parseDuration } from "../duration"

const props = defineProps<{ args: string }>()

const argSeconds = parseDuration(props.args)
const minutesInput = ref(5)
const initialSeconds = computed(
  () => argSeconds ?? Math.max(1, Math.round(minutesInput.value) || 1) * 60
)

const remaining = ref(initialSeconds.value)
const running = ref(false)
const done = ref(false)

let endAt = 0
let intervalId: number | undefined

const stopTicking = () => {
  window.clearInterval(intervalId)
  intervalId = undefined
}

const tick = () => {
  remaining.value = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
  if (remaining.value > 0) return
  running.value = false
  done.value = true
  stopTicking()
  beep()
}

const start = () => {
  if (running.value) return
  primeAudio()
  if (done.value || remaining.value <= 0) remaining.value = initialSeconds.value
  done.value = false
  endAt = Date.now() + remaining.value * 1000
  running.value = true
  intervalId = window.setInterval(tick, 250)
}

const pause = () => {
  running.value = false
  stopTicking()
}

const reset = () => {
  pause()
  done.value = false
  remaining.value = initialSeconds.value
}

watch(initialSeconds, (value) => {
  if (!running.value) remaining.value = value
})

onUnmounted(stopTicking)
</script>

<template>
  <div
    class="instrument my-4 flex w-fit items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3"
  >
    <span
      class="font-mono text-2xl tabular-nums"
      :class="done ? 'text-accent animate-pulse' : ''"
    >
      {{ formatSeconds(remaining) }}
    </span>
    <label v-if="argSeconds === null" class="flex items-center gap-1 text-sm">
      <input
        v-model.number="minutesInput"
        type="number"
        min="1"
        class="input input-sm w-16"
        :disabled="running"
        aria-label="Timer minutes"
      />
      min
    </label>
    <div class="flex gap-1">
      <button
        class="btn btn-ghost btn-sm text-accent"
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
        class="btn btn-ghost btn-sm text-accent"
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
</template>

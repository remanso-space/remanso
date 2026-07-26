<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue"

import { beep, primeAudio } from "../audio"
import { formatSeconds } from "../duration"
import { parseIntervals } from "../intervals"

const props = defineProps<{ args: string; name: string }>()

const steps = parseIntervals(props.args)
const stepList = steps ?? []
const totalSeconds = stepList.reduce((sum, step) => sum + step.seconds, 0)

const currentIndex = ref(0)
const remaining = ref(stepList[0]?.seconds ?? 0)
const running = ref(false)
const done = ref(false)

let endAt = 0
let intervalId: number | undefined

const currentStep = computed(() => stepList[currentIndex.value])
const nextStep = computed(() =>
  currentIndex.value + 1 < stepList.length
    ? stepList[currentIndex.value + 1]
    : null
)
const elapsedSeconds = computed(() => {
  if (done.value) return totalSeconds
  const before = stepList
    .slice(0, currentIndex.value)
    .reduce((sum, step) => sum + step.seconds, 0)
  return before + (currentStep.value.seconds - remaining.value)
})

/** Compact duration for the next-step preview: 90s, 2m, 1h30m. */
const compact = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h ? `${h}h` : ""}${m ? `${m}m` : ""}${s ? `${s}s` : ""}` || "0s"
}

const stopTicking = () => {
  window.clearInterval(intervalId)
  intervalId = undefined
}

const advance = () => {
  if (currentIndex.value >= stepList.length - 1) {
    running.value = false
    done.value = true
    remaining.value = 0
    stopTicking()
    return
  }
  currentIndex.value += 1
  remaining.value = stepList[currentIndex.value].seconds
  endAt = Date.now() + remaining.value * 1000
}

const tick = () => {
  remaining.value = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
  if (remaining.value > 0) return
  beep()
  advance()
}

const start = () => {
  if (running.value || stepList.length === 0) return
  primeAudio()
  if (done.value) {
    done.value = false
    currentIndex.value = 0
    remaining.value = stepList[0].seconds
  }
  endAt = Date.now() + remaining.value * 1000
  running.value = true
  intervalId = window.setInterval(tick, 250)
}

const pause = () => {
  running.value = false
  stopTicking()
}

const skip = () => {
  if (done.value) return
  advance()
}

const reset = () => {
  pause()
  done.value = false
  currentIndex.value = 0
  remaining.value = stepList[0]?.seconds ?? 0
}

onUnmounted(stopTicking)
</script>

<template>
  <div
    v-if="!steps"
    class="instrument mx-auto my-4 w-fit rounded-box border border-base-300 bg-base-100 p-3"
  >
    <span class="text-sm opacity-60">
      expected :::intervals 15m warmup, 1m plank:::
    </span>
  </div>
  <div
    v-else
    class="instrument mx-auto my-4 w-fit min-w-64 rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-sm">{{ done ? "Done" : currentStep.label }}</div>
        <span
          class="font-mono text-2xl tabular-nums"
          :class="done ? 'text-(--link-accent) animate-pulse' : ''"
        >
          {{ formatSeconds(remaining) }}
        </span>
      </div>
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
          title="Skip"
          aria-label="Skip"
          :disabled="done"
          @click="skip"
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
            <path d="M3 5v14l8 -7z" />
            <path d="M14 5v14l8 -7z" />
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
    <div class="flex justify-between gap-3 text-xs opacity-60">
      <span>step {{ currentIndex + 1 }} / {{ stepList.length }}</span>
      <span v-if="nextStep && !done">
        next: {{ nextStep.label ? `${nextStep.label} ` : ""
        }}{{ compact(nextStep.seconds) }}
      </span>
    </div>
    <progress
      class="progress mt-2 w-full [&::-webkit-progress-value]:bg-(--link-accent)"
      :value="elapsedSeconds"
      :max="totalSeconds"
    ></progress>
  </div>
</template>

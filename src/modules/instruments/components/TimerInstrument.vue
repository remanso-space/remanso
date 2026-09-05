<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue"

import { beep, primeAudio } from "../audio"
import { formatSeconds, parseDuration } from "../duration"
import type { InstrumentProps } from "../sibling"
import InstrumentButton from "./controls/InstrumentButton.vue"
import PauseIcon from "./controls/PauseIcon.vue"
import PlayIcon from "./controls/PlayIcon.vue"
import ResetIcon from "./controls/ResetIcon.vue"

const props = defineProps<InstrumentProps>()

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
    class="instrument mx-auto my-4 flex w-fit items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3"
  >
    <span
      class="font-mono text-2xl tabular-nums"
      :class="done ? 'text-(--link-accent) animate-pulse' : ''"
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
      <InstrumentButton
        :label="running ? 'Pause' : 'Start'"
        @click="running ? pause() : start()"
      >
        <PlayIcon v-if="!running" />
        <PauseIcon v-else />
      </InstrumentButton>
      <InstrumentButton
        label="Reset"
        @click="reset"
      >
        <ResetIcon />
      </InstrumentButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue"

import { breathPhaseLabel, breathScale, parseBreath } from "../breath"
import type { InstrumentProps } from "../sibling"
import InstrumentButton from "./controls/InstrumentButton.vue"
import PauseIcon from "./controls/PauseIcon.vue"
import PlayIcon from "./controls/PlayIcon.vue"
import ResetIcon from "./controls/ResetIcon.vue"

const props = defineProps<InstrumentProps>()

const pattern = parseBreath(props.args)
const phases = pattern?.phases ?? []
const cycles = pattern?.cycles ?? 0
const cycleSeconds = phases.reduce((sum, phase) => sum + phase.seconds, 0)
const totalSeconds = cycleSeconds * cycles

const phaseIndex = ref(0)
const cycleIndex = ref(0)
const remainingMs = ref((phases[0]?.seconds ?? 0) * 1000)
const running = ref(false)
const done = ref(false)

// 100 ms so the circle grows smoothly — the animation is the instrument, a
// once-a-second step would read as a stutter. No beep: a breath pacer that
// chimes defeats its own purpose.
const TICK_MS = 100

let endAt = 0
let intervalId: number | undefined

const currentPhase = computed(() => phases[phaseIndex.value])
const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000))
const label = computed(() =>
  done.value ? "Done" : breathPhaseLabel(currentPhase.value.kind)
)

const scale = computed(() => {
  const phase = currentPhase.value
  const elapsedMs = phase.seconds * 1000 - remainingMs.value
  return breathScale(phase.kind, elapsedMs / (phase.seconds * 1000))
})

const elapsedSeconds = computed(() => {
  if (done.value) return totalSeconds
  const before = phases
    .slice(0, phaseIndex.value)
    .reduce((sum, phase) => sum + phase.seconds, 0)
  return (
    cycleIndex.value * cycleSeconds +
    before +
    (currentPhase.value.seconds - remainingSeconds.value)
  )
})

const stopTicking = () => {
  window.clearInterval(intervalId)
  intervalId = undefined
}

const finish = () => {
  running.value = false
  done.value = true
  remainingMs.value = 0
  stopTicking()
}

const advance = () => {
  if (phaseIndex.value + 1 < phases.length) {
    phaseIndex.value += 1
  } else if (cycleIndex.value + 1 < cycles) {
    cycleIndex.value += 1
    phaseIndex.value = 0
  } else {
    finish()
    return
  }
  remainingMs.value = currentPhase.value.seconds * 1000
  endAt = Date.now() + remainingMs.value
}

const tick = () => {
  remainingMs.value = Math.max(0, endAt - Date.now())
  if (remainingMs.value > 0) return
  advance()
}

const start = () => {
  if (running.value || phases.length === 0) return
  if (done.value) {
    done.value = false
    cycleIndex.value = 0
    phaseIndex.value = 0
    remainingMs.value = phases[0].seconds * 1000
  }
  endAt = Date.now() + remainingMs.value
  running.value = true
  intervalId = window.setInterval(tick, TICK_MS)
}

const pause = () => {
  running.value = false
  stopTicking()
}

const reset = () => {
  pause()
  done.value = false
  cycleIndex.value = 0
  phaseIndex.value = 0
  remainingMs.value = (phases[0]?.seconds ?? 0) * 1000
}

onUnmounted(stopTicking)
</script>

<template>
  <div
    v-if="!pattern"
    class="instrument mx-auto my-4 w-fit rounded-box border border-base-300 bg-base-100 p-3"
  >
    <span class="text-sm opacity-60">expected :::breath 4-7-8:::</span>
  </div>
  <div
    v-else
    class="instrument mx-auto my-4 w-fit min-w-72 rounded-box border border-base-300 bg-base-100 p-3"
  >
    <div class="flex items-center gap-4">
      <div class="relative flex size-24 shrink-0 items-center justify-center">
        <!-- Where the inhale ends: a drawn-on-paper reference the moving ring
             comes up to meet, so the scale reads as a measure, not a blob. -->
        <div
          class="absolute size-24 rounded-full border border-dashed border-base-300"
        ></div>
        <!-- motion-reduce keeps the pacing (that IS the instrument) but drops
             the tween, matching how app.css treats the lightbox. -->
        <div
          class="breath-orb size-24 rounded-full border border-(--link-accent) bg-(--link-accent)/10 transition-transform duration-100 ease-linear motion-reduce:transition-none"
          :style="{ transform: `scale(${scale})` }"
        ></div>
      </div>
      <div class="flex-1">
        <div class="text-sm">{{ label }}</div>
        <span
          class="font-mono text-2xl tabular-nums"
          :class="done ? 'text-(--link-accent) animate-pulse' : ''"
        >
          {{ done ? 0 : remainingSeconds }}s
        </span>
        <div class="text-xs opacity-60">
          breath {{ done ? cycles : cycleIndex + 1 }} / {{ cycles }}
        </div>
      </div>
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
    <progress
      class="progress mt-2 w-full [&::-webkit-progress-value]:bg-(--link-accent)"
      :value="elapsedSeconds"
      :max="totalSeconds"
    ></progress>
  </div>
</template>

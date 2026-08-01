<script lang="ts" setup>
import { computed, ref, watch } from "vue"

import AudioLevels from "@/components/AudioLevels.vue"
import {
  MAX_RECORDING_SEC,
  useAudioRecorder
} from "@/hooks/useAudioRecorder.hook"
import { formatDuration } from "@/utils/formatDuration"

const props = defineProps<{ open: boolean; busy?: boolean }>()

const emit = defineEmits<{
  attach: [payload: { file: File; durationSec: number }]
  "update:open": [value: boolean]
}>()

const {
  state,
  elapsedSec,
  previewUrl,
  take,
  levels,
  devices,
  deviceId,
  isCapturing,
  selectDevice,
  refreshDevices,
  start,
  pause,
  resume,
  stop,
  reset
} = useAudioRecorder()

const dialogRef = ref<HTMLDialogElement | null>(null)

const timer = computed(() => formatDuration(elapsedSec.value) ?? "0:00")
const remaining = computed(() => MAX_RECORDING_SEC - elapsedSec.value)
// The cap only matters once it's close enough to change what the user does.
const showCapWarning = computed(
  () => isCapturing.value && remaining.value <= 5 * 60
)

// Nothing here is recoverable once the dialog closes — the chunks live in
// memory only — so a take in progress holds the modal open until it is
// explicitly stopped and then attached or discarded.
const canClose = computed(() => !isCapturing.value && !props.busy)

// One microphone is not a choice, and before the first grant the browser
// reports a single anonymous entry — a picker there would be noise.
const canPickDevice = computed(
  () => devices.value.length > 1 && !isCapturing.value
)

const close = () => {
  if (!canClose.value) return
  reset()
  if (dialogRef.value?.open) dialogRef.value.close()
  emit("update:open", false)
}

const onAttach = () => {
  const file = take.value
  if (!file) return
  emit("attach", { file, durationSec: elapsedSec.value })
}

watch(
  () => props.open,
  (open) => {
    const el = dialogRef.value
    if (!el) return
    if (open && !el.open) {
      reset()
      void refreshDevices()
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }
)
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal"
    @close="emit('update:open', false)"
    @cancel.prevent="close()"
  >
    <div class="modal-box recorder">
      <h3 class="text-lg font-bold">Record audio</h3>

      <p v-if="state === 'denied'" class="py-3 text-sm">
        The microphone is blocked for this site. Allow it in your browser's site
        settings, then try again.
      </p>
      <p v-else-if="state === 'unsupported'" class="py-3 text-sm">
        This browser can't record audio. Attach a file recorded elsewhere
        instead.
      </p>
      <p v-else-if="state === 'idle'" class="py-3 text-sm">
        The recording is attached to this note and uploaded to your PDS. Keep
        this tab in the foreground — a backgrounded tab can lose the take.
      </p>

      <label v-if="canPickDevice" class="device-picker form-control">
        <span class="label-text text-sm">Microphone</span>
        <select
          class="select select-sm select-bordered"
          :value="deviceId"
          @change="selectDevice(($event.target as HTMLSelectElement).value)"
        >
          <option value="">System default</option>
          <option
            v-for="device in devices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>
      </label>

      <audio-levels
        v-if="isCapturing"
        :levels="levels"
        :paused="state === 'paused'"
      />

      <div class="readout">
        <span
          v-if="state === 'recording'"
          class="pulse"
          aria-hidden="true"
        ></span>
        <span class="elapsed">{{ timer }}</span>
        <span v-if="state === 'paused'" class="badge badge-sm">paused</span>
      </div>

      <p v-if="showCapWarning" class="cap text-sm">
        Recording stops automatically in {{ formatDuration(remaining) }}.
      </p>

      <audio
        v-if="state === 'ready' && previewUrl"
        controls
        class="preview"
        :src="previewUrl"
      ></audio>

      <div class="modal-action">
        <button
          v-if="state === 'idle' || state === 'denied'"
          type="button"
          class="btn btn-primary"
          @click="start()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-microphone"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path
              d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"
            />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <path d="M8 21l8 0" />
            <path d="M12 17l0 4" />
          </svg>
          Start recording
        </button>

        <button
          v-if="state === 'recording'"
          type="button"
          class="btn btn-ghost"
          @click="pause()"
        >
          Pause
        </button>
        <button
          v-if="state === 'paused'"
          type="button"
          class="btn btn-ghost"
          @click="resume()"
        >
          Resume
        </button>
        <button
          v-if="isCapturing"
          type="button"
          class="btn btn-primary"
          @click="stop()"
        >
          Stop
        </button>

        <button
          v-if="state === 'ready'"
          type="button"
          class="btn btn-ghost"
          :disabled="busy"
          @click="reset()"
        >
          Record again
        </button>
        <button
          v-if="state === 'ready'"
          type="button"
          class="btn btn-primary"
          :disabled="busy"
          @click="onAttach()"
        >
          <span v-if="busy" class="loading loading-spinner loading-sm"></span>
          {{ busy ? "Uploading…" : "Attach to note" }}
        </button>

        <button
          type="button"
          class="btn btn-ghost"
          :disabled="!canClose"
          @click="close()"
        >
          {{ state === "ready" ? "Discard" : "Close" }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="submit" :disabled="!canClose" @click.prevent="close()">
        close
      </button>
    </form>
  </dialog>
</template>

<style lang="scss" scoped>
.device-picker {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.readout {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
}

.elapsed {
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
}

.pulse {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--color-error);
  animation: recording-pulse 1.4s ease-in-out infinite;
}

@keyframes recording-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
}

.cap {
  opacity: 0.7;
}

.preview {
  width: 100%;
  margin-bottom: 0.5rem;
}

.modal-action {
  flex-wrap: wrap;
}
</style>

<script setup lang="ts">
import { computed } from "vue"

import type { ResolvedRecording } from "@/modules/atproto/recording.types"
import { formatDuration } from "@/utils/formatDuration"

const props = defineProps<{
  atUri: string
  alt: string
  recording: ResolvedRecording | null
}>()

const label = computed(() => props.recording?.title || props.alt)

const duration = computed(() => formatDuration(props.recording?.durationSec))
</script>

<template>
  <figure v-if="recording" class="recording-player">
    <figcaption class="recording-caption">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-microphone-2"
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
        <path d="M15 12.9a5 5 0 1 0 -3.902 -3.9" />
        <path
          d="M15 12.9l-3.902 -3.899l-7.513 8.584a2 2 0 1 0 2.83 2.83l8.585 -7.515z"
        />
      </svg>
      <span class="recording-title">{{ label }}</span>
      <span v-if="duration" class="recording-duration">{{ duration }}</span>
    </figcaption>
    <audio controls preload="metadata" :src="recording.blobUrl"></audio>
  </figure>
  <p v-else class="recording-unavailable">
    <a :href="atUri">{{ alt }}</a>
  </p>
</template>

<style scoped lang="scss">
.recording-player {
  margin: 1.5rem 0;

  audio {
    width: 100%;
  }
}

.recording-caption {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9em;

  svg {
    color: var(--link-accent);
    flex-shrink: 0;
  }
}

.recording-title {
  font-weight: 600;
}

.recording-duration {
  margin-left: auto;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.recording-unavailable a {
  color: var(--link-accent);
}
</style>

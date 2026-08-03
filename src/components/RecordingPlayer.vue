<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef } from "vue"

import type { ResolvedRecording } from "@/modules/atproto/recording.types"
import { formatDuration } from "@/utils/formatDuration"

const props = defineProps<{
  atUri: string
  alt: string
  recording: ResolvedRecording | null
}>()

const label = computed(() => props.recording?.title || props.alt)

const duration = computed(() => formatDuration(props.recording?.durationSec))

const player = useTemplateRef<HTMLAudioElement>("player")

/**
 * A `blob:` URL for the downloaded audio, once we have it.
 *
 * `com.atproto.sync.getBlob` does not honour Range: it answers a
 * `Range: bytes=45274-465202` with 200 and the whole body from byte zero, no
 * Content-Range. Chrome notices the 200 and re-reads from the start; WebKit
 * trusts the offset it asked for and lays the opening bytes down at 45274, so
 * the stream it decodes is garbage — playback fails with no sound on Safari the
 * moment the element resumes or seeks rather than reading straight through.
 *
 * Downloading the blob ourselves and handing the element a local copy takes the
 * element out of that negotiation entirely: a `blob:` URL is seekable, so
 * scrubbing works too. The record already carries the title and the duration,
 * so nothing is lost by loading no metadata up front.
 */
const localUrl = ref<string | null>(null)
let downloading = false

const source = computed(() => localUrl.value ?? props.recording?.blobUrl)

const release = () => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value)
  localUrl.value = null
}

/**
 * Pressing play is what asks for the bytes — a reader who never plays pays
 * nothing. The element has just started its own doomed request; pausing aborts
 * it, and play() resumes from the local copy once it is here. A failed download
 * lets the element carry on with the remote URL: reading straight through from
 * byte zero is the one case the PDS does serve correctly.
 */
const playLocalCopy = async () => {
  if (!props.recording || localUrl.value || downloading) return
  downloading = true
  player.value?.pause()

  try {
    const response = await fetch(props.recording.blobUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    release()
    localUrl.value = URL.createObjectURL(await response.blob())
  } catch (error) {
    console.warn("RecordingPlayer: could not download the recording", error)
  } finally {
    downloading = false
    // The src binding has to reach the element before playback resumes:
    // play() on the URL we are replacing starts a load that the patch then
    // cancels, leaving the element paused and the reader pressing play twice.
    await nextTick()
    void player.value
      ?.play()
      .catch((error: unknown) =>
        console.warn("RecordingPlayer: could not resume playback", error)
      )
  }
}

onUnmounted(release)
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
    <audio
      ref="player"
      controls
      preload="none"
      :src="source"
      @play="playLocalCopy()"
    ></audio>
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

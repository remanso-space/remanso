<script lang="ts" setup>
import { ref } from "vue"

defineProps<{ canAttachAudio: boolean; busy: boolean }>()

const emit = defineEmits<{
  image: [file: File]
  audio: [file: File]
  record: []
}>()

const imageInput = ref<HTMLInputElement | null>(null)
const audioInput = ref<HTMLInputElement | null>(null)

// Clearing the input is what lets the same file be picked twice in a row —
// without it a re-pick fires no change event.
const pick = (event: Event, emitFile: (file: File) => void) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (file) emitFile(file)
}
</script>

<template>
  <div class="edit-toolbar">
    <button
      type="button"
      class="btn btn-sm btn-ghost"
      :title="busy ? 'Uploading…' : 'Insert image'"
      :disabled="busy"
      @click="imageInput?.click()"
    >
      <span v-if="busy" class="loading loading-spinner loading-xs"></span>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-photo-plus"
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
        <path d="M15 8h.01" />
        <path
          d="M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5"
        />
        <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l4 4" />
        <path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l2 2" />
        <path d="M16 19h6" />
        <path d="M19 16v6" />
      </svg>
      <span class="label">Image</span>
    </button>
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="pick($event, (file) => emit('image', file))"
    />

    <template v-if="canAttachAudio">
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        :title="busy ? 'Uploading…' : 'Attach an audio file'"
        :disabled="busy"
        @click="audioInput?.click()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="icon icon-tabler icon-tabler-music-plus"
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
          <path d="M12 17a3 3 0 1 0 -6 0a3 3 0 0 0 6 0" />
          <path d="M12 17v-13h7v4h-7" />
          <path d="M16 19h6" />
          <path d="M19 16v6" />
        </svg>
        <span class="label">Audio</span>
      </button>
      <input
        ref="audioInput"
        type="file"
        accept="audio/*"
        class="hidden-input"
        @change="pick($event, (file) => emit('audio', file))"
      />

      <button
        type="button"
        class="btn btn-sm btn-ghost"
        title="Record audio"
        :disabled="busy"
        @click="emit('record')"
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
        <span class="label">Record</span>
      </button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.edit-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  // Long notes scroll a long way; the toolbar following the caret down is the
  // point of moving it out of the header.
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.25rem 0;
  background-color: var(--color-base-100);
  border-bottom: 1px solid var(--color-base-300);
}

.hidden-input {
  display: none;
}

svg {
  color: var(--link-accent);
}

// Labels are what make the toolbar readable now that it has room, but three of
// them still crowd a narrow phone.
@media screen and (max-width: 480px) {
  .label {
    display: none;
  }
}
</style>

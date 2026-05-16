<script setup lang="ts">
import { useOfflineNotes } from "@/hooks/useOfflineNotes.hook"
import { confirmMessage, errorMessage } from "@/utils/notif"

const {
  cacheAllNotes,
  isLoading,
  totalOfNotes,
  noteCompleted,
  failedNotes,
  failures
} = useOfflineNotes()

const confirmBeforeCachingAllNotes = async () => {
  confirm("Do you want to cache all notes?")
  await cacheAllNotes()
  if (failedNotes.value > 0) {
    console.table(failures.value)
    errorMessage(
      `${failedNotes.value} of ${totalOfNotes.value} note(s) could not be cached — try again`
    )
  } else {
    confirmMessage("✅ All notes have been locally saved")
  }
}
</script>

<template>
  <div v-if="isLoading" class="cache-all-notes">
    <progress
      :value="noteCompleted"
      class="progress progress-accent w-56"
      :max="totalOfNotes"
    ></progress>
    <div class="numeric">{{ noteCompleted }}/{{ totalOfNotes }}</div>
  </div>
  <button v-else class="button" @click="() => confirmBeforeCachingAllNotes()">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-cloud-off"
      width="30"
      height="30"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path
        d="M9.58 5.548c.24 -.11 .492 -.207 .752 -.286c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 .957 -.383 1.824 -1.003 2.454m-2.997 1.033h-11.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.13 -.582 .37 -1.128 .7 -1.62"
      />
      <path d="M3 3l18 18" />
    </svg>
  </button>
</template>

<style scoped lang="scss">
.cache-all-notes {
  text-align: center;
}

.numeric {
  font-family: "Courier Prime", monospace;
}
</style>

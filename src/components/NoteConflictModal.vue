<script lang="ts" setup>
import { onMounted, ref, watch } from "vue"

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  discard: []
  overwrite: []
  cancel: []
  "update:open": [value: boolean]
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)

const close = () => {
  if (dialogRef.value?.open) dialogRef.value.close()
  emit("update:open", false)
}

const onDiscard = () => {
  emit("discard")
  close()
}
const onOverwrite = () => {
  emit("overwrite")
  close()
}
const onCancel = () => {
  emit("cancel")
  close()
}

watch(
  () => props.open,
  (open) => {
    const el = dialogRef.value
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }
)

onMounted(() => {
  if (props.open) dialogRef.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal"
    @close="emit('update:open', false)"
    @cancel.prevent="onCancel()"
  >
    <div class="modal-box">
      <h3 class="text-lg font-bold">GitHub has a newer version of this note</h3>
      <p class="py-3 text-sm">
        Someone (or another device) updated this note on GitHub since you
        started editing. If you save now, their changes will be overwritten.
      </p>

      <div class="modal-action flex-col gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          @click="onCancel()"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-warning"
          @click="onOverwrite()"
        >
          Save anyway (overwrite)
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="onDiscard()"
        >
          Discard my edits, pull latest
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="submit" @click="onCancel()">close</button>
    </form>
  </dialog>
</template>

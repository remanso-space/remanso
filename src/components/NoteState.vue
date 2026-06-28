<script lang="ts" setup>
defineProps<{ status: "loading" | "failed" }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="note-state">
    <span
      v-if="status === 'loading'"
      class="loading loading-spinner loading-md"
      aria-label="Loading note"
    ></span>
    <template v-else>
      <p class="note-state-message">Couldn't load this note.</p>
      <button type="button" class="note-state-retry" @click="$emit('retry')">
        Retry
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.note-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: var(--color-base-content);
  opacity: 0.55;
  text-align: center;
}

.note-state-message {
  margin: 0;
}

.note-state-retry {
  padding: 0.25rem 0.85rem;
  border: 1px solid currentColor;
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
</style>

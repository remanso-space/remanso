<script setup lang="ts">
defineProps<{
  removable: boolean
  removeLabel: string
}>()

defineEmits<{
  remove: []
}>()
</script>

<template>
  <span class="todo-chip" @click.stop>
    <slot name="icon" />
    <slot />
    <button
      v-if="removable"
      class="todo-chip-close"
      type="button"
      :aria-label="removeLabel"
      @click.stop="$emit('remove')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-x"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    </button>
  </span>
</template>

<style scoped lang="scss">
.todo-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  vertical-align: baseline;
}

.todo-chip-close {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin-left: 0.1rem;
  padding: 0;
  background: transparent;
  border: 0;
  color: inherit;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}
</style>

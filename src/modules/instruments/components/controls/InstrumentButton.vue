<script setup lang="ts">
defineProps<{
  /** Used for both the tooltip and the accessible name. */
  label: string
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="btn btn-ghost btn-sm text-(--link-accent)"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue"

import FluxNote from "@/components/FluxNote.vue"
import { useComputeBacklinks } from "@/hooks/useComputeBacklinks.hook"

useComputeBacklinks()

const props = defineProps<{ user: string; repo: string }>()
const routeKey = computed(() => `${props.user}-${props.repo}`)
</script>

<template>
  <flux-note :key="routeKey" :user="user" :repo="repo" />
</template>

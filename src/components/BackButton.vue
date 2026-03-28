<script setup lang="ts">
import { type RouteLocationRaw, useRouter } from "vue-router"

const props = withDefaults(
  defineProps<{ fallback?: RouteLocationRaw; preferFallback?: boolean }>(),
  { preferFallback: true }
)

const router = useRouter()
const goBack = () => {
  if (props.preferFallback && props.fallback) {
    router.push(props.fallback)
    return
  }

  if (window.history.state?.back) {
    router.back()
  } else if (props.fallback) {
    router.push(props.fallback)
  } else {
    router.back()
  }
}
</script>

<template>
  <a class="btn btn-sm back-button" @click="goBack">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-arrow-narrow-left"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="12" x2="9" y2="16" />
      <line x1="5" y1="12" x2="9" y2="8" />
    </svg>
  </a>
</template>

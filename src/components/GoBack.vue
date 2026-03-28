<script lang="ts" setup>
import { useRouter } from "vue-router"

const { push } = useRouter()

const back = () =>
  push({
    name: "Home"
  })
</script>

<template>
  <button class="button is-white go-back" @click="back">
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
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="12" x2="9" y2="16" />
      <line x1="5" y1="12" x2="9" y2="8" />
    </svg>
  </button>
</template>

<style lang="scss" scoped>
.go-back {
  margin: 10px 0;
}
</style>

<script setup lang="ts">
import { useRouter } from "vue-router"

const router = useRouter()
const goHome = () => router.push({ name: "Home" })
</script>

<template>
  <button class="btn btn-ghost btn-circle btn-lg text-base-content" @click="goHome">
    <img src="/favicon.png" alt="Remanso icon" class="remanso-logo" />
  </button>
</template>

<style>
img {
  box-shadow: none;
}

.remanso-logo {
  width: 32px;
  height: 32px;
  view-transition-name: remanso-logo;
}
</style>

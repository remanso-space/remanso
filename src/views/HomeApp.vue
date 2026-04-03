<script setup lang="ts">
import AuthorizeUser from "@/components/AuthorizeUser.vue"
import WelcomeWorld from "@/components/WelcomeWorld.vue"
</script>

<template>
  <div class="home content">
    <authorize-user class="authorize" />
    <welcome-world />
  </div>
</template>

<style lang="scss" scoped>
.home {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  height: 100dvh;
}

.authorize {
  margin: auto;
}
</style>

<script lang="ts" setup>
import NewVersion from "@/components/NewVersion.vue"
import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"

const { isReady } = useGitHubLogin()
const { isATProtoReady } = useATProtoLogin()
</script>

<template>
  <div id="main-app" class="prose">
    <router-view v-if="isReady && isATProtoReady" />

    <new-version />
  </div>
</template>

<style lang="scss">
#main-app {
  height: 100dvh;
  width: 100%;
  max-width: none;
  display: flex;
  flex: 1;
  overflow-x: auto;
}

@media screen and (max-width: 768px) {
  #main-app {
    overflow-y: auto;
  }
}

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.25s;
}

::view-transition-group(remanso-logo) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

::view-transition-old(remanso-logo),
::view-transition-new(remanso-logo) {
  object-fit: contain;
}
</style>

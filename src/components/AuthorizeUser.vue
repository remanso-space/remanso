<script lang="ts" setup>
import { onBeforeMount, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { signIn } from "@/modules/user/service/signIn"

const route = useRoute()
const router = useRouter()
const { saveCredentials } = useGitHubLogin()

const code = route.query.code
const hasError = ref(false)

onBeforeMount(async () => {
  if (code) {
    const token = await signIn(code.toString())

    if ("error" in token) {
      hasError.value = true
    } else {
      await saveCredentials(token)
    }

    router.replace({ name: "Home" })
  }
})
</script>

<template>
  <div class="authorize-user">
    <div v-if="hasError">An error occured when sign in...</div>
  </div>
</template>

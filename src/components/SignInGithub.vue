<script lang="ts" setup>
import { useRoute } from "vue-router"

import { GITHUB_OAUTH_RETURN_PATH_KEY } from "@/modules/user/service/oauthReturnPath"

const GITHUB_URL = "https://github.com/login/oauth/authorize"

const CLIENT_ID = "Iv1.12dc43d013ce3623"
const SCOPE = "repo%20workflow"
const REDIRECT_URI = window.location.origin

const route = useRoute()

const url = new URL(GITHUB_URL)
url.searchParams.set("client_id", CLIENT_ID)
url.searchParams.set("scope", SCOPE)
url.searchParams.set("redirect_uri", REDIRECT_URI)

const href = url.toString()

const saveReturnPath = () => {
  sessionStorage.setItem(GITHUB_OAUTH_RETURN_PATH_KEY, route.fullPath)
}
</script>

<template>
  <a
    :href="href"
    class="sign-in-github btn btn-sm btn-primary"
    @click="saveReturnPath"
  >
    Sign in with
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-brand-github"
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
      <path
        d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
      />
    </svg>
  </a>
</template>

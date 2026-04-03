<script lang="ts" setup>
const url = new URL("https://github.com/login/oauth/authorize")
url.searchParams.append("client_id", "Iv1.87be14adcc912fa0")
url.searchParams.append("redirect_uri", location.href)
url.searchParams.append("scope", "repo")
</script>

<template>
  <div class="login-github">
    <br />
    <a
      class="btn btn-primary"
      :href="url.toString()"
      target="_blank"
      rel="noopener noreferrer"
    >
      login to
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
  </div>
</template>

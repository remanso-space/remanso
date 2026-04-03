<script lang="ts" setup></script>

<template>
  <main class="space-cowboy content">
    <p>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-alert-circle"
        width="52"
        height="52"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Oops, you've been lost!
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-alert-circle"
        width="52"
        height="52"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </p>
    <p>A note link can't be used as URL.</p>
    <router-link class="button is-links" :to="{ name: 'Home' }"
      >return to homepage</router-link
    >
  </main>
</template>

<style scoped lang="scss">
.space-cowboy {
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: center;
  align-items: center;

  p {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
}
</style>

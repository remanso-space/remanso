<script lang="ts" setup>
import { computed } from "vue"

import type { FreshnessStatus } from "@/hooks/useNoteFreshness.hook"

const props = defineProps<{
  status: FreshnessStatus
  lastCheckedAt: Date | null
}>()

defineEmits<{ (e: "click"): void }>()

const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })

const label = computed(() => {
  switch (props.status) {
    case "verified":
      return "Up to date"
    case "checking":
      return "Checking…"
    case "outdated":
      return "Outdated"
    case "offline":
      return "Can’t reach GitHub"
    case "unauthorized":
      return "Sign in to GitHub"
    case "unknown":
    default:
      return "Not checked"
  }
})

const tooltip = computed(() => {
  switch (props.status) {
    case "verified":
      return props.lastCheckedAt
        ? `Verified at ${formatTime(props.lastCheckedAt)}. Click to re-check.`
        : "Click to re-check."
    case "outdated":
      return "GitHub has a newer version. Click to pull latest."
    case "offline":
      return "Could not reach GitHub. Click to retry."
    case "unauthorized":
      return "GitHub auth expired. Sign in again, then click to retry."
    case "checking":
      return "Checking against GitHub…"
    case "unknown":
    default:
      return "Click to check against GitHub."
  }
})

const stateClass = computed(() => `state-${props.status}`)
const isBusy = computed(() => props.status === "checking")
</script>

<template>
  <button
    class="freshness button is-text is-light"
    :class="stateClass"
    :title="tooltip"
    :aria-label="tooltip"
    :disabled="isBusy"
    @click="$emit('click')"
  >
    <svg
      v-if="status === 'verified'"
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-cloud-check"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M11 18.004h-4.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.388 0 2.585 .82 3.138 2.007"
      />
      <path d="M15 19l2 2l4 -4" />
    </svg>
    <svg
      v-else-if="status === 'unknown'"
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-cloud-question"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M14.5 18.004h-7.843c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99"
      />
      <path d="M19 22v.01" />
      <path
        d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"
      />
    </svg>
    <svg
      v-else-if="status === 'outdated'"
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-cloud-download"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M19 18a3.5 3.5 0 0 0 0 -7h-1a5 4.5 0 0 0 -11 -2a4.6 4.4 0 0 0 -2.1 8.4"
      />
      <path d="M12 13l0 9" />
      <path d="M9 19l3 3l3 -3" />
    </svg>
    <svg
      v-else-if="status === 'checking'"
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-loader-2 spin"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
    <svg
      v-else-if="status === 'unauthorized'"
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-cloud-lock"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M11 18.004h-4.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.18 0 2.227 .593 2.85 1.5"
      />
      <path
        d="M15 16m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
      />
      <path d="M18 14a2 2 0 0 1 2 2v0h-4v0a2 2 0 0 1 2 -2z" />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-cloud-off"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M9.58 5.548c.24 -.11 .492 -.207 .752 -.286c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 .957 -.383 1.824 -1.003 2.454m-2.997 1.033h-11.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.13 -.582 .37 -1.128 .7 -1.62"
      />
      <path d="M3 3l18 18" />
    </svg>
  </button>
</template>

<style lang="scss" scoped>
.freshness {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background: transparent;
  border: 0;
  cursor: pointer;
  vertical-align: middle;

  &[disabled] {
    cursor: progress;
  }

  .icon {
    flex-shrink: 0;
  }

  .freshness-label {
    line-height: 1;
  }
}

.state-verified {
  color: var(--color-success, hsl(140, 60%, 35%));
}

.state-outdated {
  color: var(--color-warning, hsl(35, 90%, 45%));
}

.state-offline {
  color: var(--color-error, hsl(0, 70%, 45%));
}

.state-unauthorized {
  color: var(--color-warning, hsl(35, 90%, 45%));
}

.state-unknown,
.state-checking {
  color: var(--color-base-content);
  opacity: 0.6;
}

.spin {
  animation: freshness-spin 1s linear infinite;
}

@keyframes freshness-spin {
  to {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: 768px) {
  .freshness-label {
    display: none;
  }
}
</style>

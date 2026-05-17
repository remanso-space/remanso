<script setup lang="ts">
import { computed } from "vue"

import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"

const { username, accessToken } = useGitHubLogin()
const { isLoggedIn: isATProtoLoggedIn, handle, avatarUrl } = useATProtoLogin()

defineEmits<{
  click: []
}>()

const isGitHubLoggedIn = computed(() => !!accessToken.value)
const isAnyUserLoggedIn = computed(
  () => isGitHubLoggedIn.value || isATProtoLoggedIn.value
)
const displayUsername = computed(() => handle.value || username.value || "")
const displayInitial = computed(() =>
  (displayUsername.value[0] || "?").toUpperCase()
)
</script>

<template>
  <button
    v-if="isAnyUserLoggedIn"
    class="profile-chip"
    type="button"
    @click="$emit('click')"
  >
    <img
      v-if="isATProtoLoggedIn && avatarUrl"
      :src="avatarUrl"
      class="profile-avatar-small"
      alt="Profile"
    />
    <span v-else class="profile-avatar-small profile-avatar-initial">
      {{ displayInitial }}
    </span>
    <span class="profile-name">{{ displayUsername }}</span>
  </button>
  <button
    v-else
    class="profile-chip profile-chip--ghost"
    type="button"
    @click="$emit('click')"
  >
    Sign in
  </button>
</template>

<style scoped lang="scss">
.profile-chip {
  --pill-rule: color-mix(
    in oklch,
    var(--color-base-content) 12%,
    var(--color-base-200)
  );
  --pill-accent: #e36598;
  --pill-accent-wash: color-mix(
    in oklch,
    #e36598 12%,
    var(--color-base-200)
  );

  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem 0.25rem 0.25rem;
  border-radius: 999px;
  border: 1px solid var(--pill-rule);
  background: transparent;
  cursor: pointer;
  color: var(--color-base-content);
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: var(--pill-accent);
    background: var(--pill-accent-wash);
  }

  &.profile-chip--ghost {
    padding: 0.35rem 0.9rem;
    font-size: 0.95rem;
  }
}

.profile-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.profile-avatar-initial {
  background: var(--pill-accent, #e36598);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.profile-name {
  font-size: 0.95rem;
}
</style>

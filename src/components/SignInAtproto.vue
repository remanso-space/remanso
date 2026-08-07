<script setup lang="ts">
import { AtprotoLogin } from "vue-atproto-login"

withDefaults(
  defineProps<{
    withSignOut?: boolean
  }>(),
  {
    withSignOut: true
  }
)
</script>

<template>
  <!--
    `unstyled` drops every class the package would set, so the hooks below are the
    only ones on the elements and daisyUI has nothing to fight. The rows come from
    the slot rather than the defaults: slot markup compiles in this component, so
    it carries this file's scope and the styles underneath keep working on it.
  -->
  <AtprotoLogin
    :with-sign-out="withSignOut"
    placeholder="alice.bsky.social"
    unstyled
    :ui="{
      root: 'sign-in-atproto',
      loading: 'skeleton h-8 w-40',
      signedIn: 'sign-in-atproto is-signed-in',
      avatar: 'signed-in-avatar',
      signOut: 'btn btn-sm',
      form: 'join',
      input: 'input input-sm join-item',
      button: 'btn input-sm join-item',
      suggestions: 'sign-in-atproto-suggestions'
    }"
  >
    <template #suggestion="{ suggestion, active }">
      <span class="suggestion" :class="{ active }">
        <img
          v-if="suggestion.avatar"
          class="suggestion-avatar"
          :src="suggestion.avatar"
          alt=""
          loading="lazy"
        />
        <span v-else class="suggestion-avatar placeholder" aria-hidden="true" />
        <span class="suggestion-text">
          <span class="suggestion-handle">{{ suggestion.handle }}</span>
          <span v-if="suggestion.displayName" class="suggestion-name">
            {{ suggestion.displayName }}
          </span>
        </span>
      </span>
    </template>
  </AtprotoLogin>
</template>

<style scoped>
.sign-in-atproto {
  position: relative;
}

.is-signed-in {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.signed-in-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
}

/*
  The listbox belongs to the package, and a scope attribute only lands on a
  component's root element — so this one needs :deep() to reach past the wrapper.
  The rows below do not: they come from the slot, which is our markup.
*/
:deep(.sign-in-atproto-suggestions) {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.3rem);
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 17rem;
  overflow-y: auto;
  border: 1px solid var(--color-base-300);
  border-radius: var(--radius-box, 0.5rem);
  background: var(--color-base-100);
  box-shadow: 0 8px 24px color-mix(in oklch, var(--color-base-content) 18%, transparent);
}

.suggestion {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  width: 100%;
  min-width: 0;
}

.suggestion.active {
  background: var(--link-accent);
}

.suggestion-avatar {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}

.suggestion-avatar.placeholder {
  background: color-mix(in oklch, var(--color-base-content) 15%, transparent);
}

.suggestion-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.suggestion-handle {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-name {
  font-size: 0.8rem;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion.active .suggestion-handle,
.suggestion.active .suggestion-name {
  color: var(--color-base-100);
  opacity: 1;
}
</style>

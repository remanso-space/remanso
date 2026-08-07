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
    only ones on these elements and daisyUI has nothing to fight.

    `not-prose` because the box renders inside `#main-app.prose`: Tailwind
    typography gives every `img` a 2em vertical margin and every `li` a marker and
    margins of its own, which is right for a note and wrong for an avatar in a row.
  -->
  <AtprotoLogin
    :with-sign-out="withSignOut"
    placeholder="alice.bsky.social"
    unstyled
    :ui="{
      root: 'sign-in-atproto not-prose',
      loading: 'skeleton h-8 w-40',
      signedIn: 'sign-in-atproto-signed-in',
      avatar: 'sign-in-atproto-avatar',
      signOut: 'btn btn-sm',
      form: 'join',
      input: 'input input-sm join-item',
      button: 'btn input-sm join-item',
      suggestions: 'sign-in-atproto-suggestions'
    }"
  >
    <template #suggestion="{ suggestion, active }">
      <span class="sign-in-atproto-suggestion" :class="{ 'is-active': active }">
        <img
          v-if="suggestion.avatar"
          class="sign-in-atproto-suggestion-avatar"
          :src="suggestion.avatar"
          alt=""
          loading="lazy"
        />
        <span
          v-else
          class="sign-in-atproto-suggestion-avatar is-placeholder"
          aria-hidden="true"
        />
        <span class="sign-in-atproto-suggestion-text">
          <span class="sign-in-atproto-suggestion-handle">
            {{ suggestion.handle }}
          </span>
          <span
            v-if="suggestion.displayName"
            class="sign-in-atproto-suggestion-name"
          >
            {{ suggestion.displayName }}
          </span>
        </span>
      </span>
    </template>
  </AtprotoLogin>
</template>

<!--
  Not scoped. Vue writes a scope attribute onto a child component's *root element*
  only, so scoped rules here would reach `.sign-in-atproto` and nothing under it —
  every class below sits on DOM the package renders. Names are prefixed instead,
  which is what keeps them from colliding.
-->
<style>
.sign-in-atproto {
  position: relative;
}

.sign-in-atproto-signed-in {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.sign-in-atproto-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}

.sign-in-atproto-suggestions {
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

.sign-in-atproto-suggestions li {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sign-in-atproto-suggestion {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  min-width: 0;
  padding: 0.4rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
}

.sign-in-atproto-suggestion.is-active {
  background: var(--link-accent);
}

.sign-in-atproto-suggestion-avatar {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}

.sign-in-atproto-suggestion-avatar.is-placeholder {
  background: color-mix(in oklch, var(--color-base-content) 15%, transparent);
}

.sign-in-atproto-suggestion-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.sign-in-atproto-suggestion-handle {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sign-in-atproto-suggestion-name {
  font-size: 0.8rem;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sign-in-atproto-suggestion.is-active .sign-in-atproto-suggestion-handle,
.sign-in-atproto-suggestion.is-active .sign-in-atproto-suggestion-name {
  color: var(--color-base-100);
  opacity: 1;
}
</style>

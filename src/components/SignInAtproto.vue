<script setup lang="ts">
import { onUnmounted, ref } from "vue"

import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import {
  type ActorSuggestion,
  searchActors} from "@/modules/atproto/searchActors"

const { handle, isLoggedIn, isATProtoReady, signIn, signOut } =
  useATProtoLogin()

withDefaults(
  defineProps<{
    withSignOut?: boolean
  }>(),
  {
    withSignOut: true
  }
)

const inputHandle = ref("")

// Set once the browser is on its way to Bluesky. The redirect replaces the page, so this
// never has to reset on success — it only flips back if signInWithHandle rejects (a bad
// handle, say) before it can navigate. It exists to tell "we're going" apart from a stale,
// idle box that looks the same.
const redirecting = ref(false)

// The suggestion box. Handles come from the public appview's typeahead over every atproto
// account, so the exact spelling is findable before signing in. A free-typed handle still
// works: the list is a shortcut, not a gate.
const SUGGEST_DEBOUNCE_MS = 180

const suggestions = ref<ActorSuggestion[]>([])
const suggestOpen = ref(false)
const activeIndex = ref(-1)

let suggestTimer: ReturnType<typeof setTimeout> | undefined
let suggestAbort: AbortController | undefined

const runSuggest = async (query: string) => {
  suggestAbort?.abort()
  const controller = new AbortController()
  suggestAbort = controller

  const found = await searchActors(query, { signal: controller.signal })
  if (controller.signal.aborted) return
  suggestions.value = found
  suggestOpen.value = found.length > 0
  activeIndex.value = -1
}

const onInput = () => {
  const query = inputHandle.value.trim()
  clearTimeout(suggestTimer)

  if (!query) {
    suggestAbort?.abort()
    suggestions.value = []
    suggestOpen.value = false
    activeIndex.value = -1
    return
  }
  suggestTimer = setTimeout(() => void runSuggest(query), SUGGEST_DEBOUNCE_MS)
}

const closeSuggestions = () => {
  suggestOpen.value = false
  activeIndex.value = -1
}

const startSignIn = async (value: string) => {
  const target = value.trim()
  if (!target || redirecting.value) return

  clearTimeout(suggestTimer)
  suggestAbort?.abort()
  closeSuggestions()

  redirecting.value = true
  try {
    await signIn(target)
  } catch (error) {
    // Never made it to Bluesky — let the user try again rather than sit on a dead label.
    console.warn("SignInAtproto: sign-in redirect failed", error)
    redirecting.value = false
  }
}

const pick = (suggestion: ActorSuggestion) => {
  inputHandle.value = suggestion.handle
  void startSignIn(suggestion.handle)
}

// Enter with a highlighted row takes that row; with none it takes what is typed, so a handle
// the appview has never indexed is still reachable.
const onSubmit = () => {
  const highlighted = suggestOpen.value ? suggestions.value[activeIndex.value] : undefined
  if (highlighted) {
    pick(highlighted)
    return
  }
  void startSignIn(inputHandle.value)
}

// Arrows cycle through the rows and back out to "nothing highlighted", so holding ArrowUp
// returns you to what you typed instead of trapping you in the list. Slot 0 is that
// no-selection state, slots 1..n are the rows.
const moveActive = (step: number) => {
  if (!suggestions.value.length) return
  if (!suggestOpen.value) {
    suggestOpen.value = true
    return
  }
  const slots = suggestions.value.length + 1
  activeIndex.value = ((activeIndex.value + 1 + step + slots) % slots) - 1
}

onUnmounted(() => {
  clearTimeout(suggestTimer)
  suggestAbort?.abort()
})
</script>

<template>
  <div v-if="!isATProtoReady" class="skeleton h-8 w-40"></div>
  <div v-else-if="isLoggedIn" class="sign-in-atproto is-signed-in">
    <span>{{ handle }}</span>
    <button class="btn btn-sm" @click="signOut" v-if="withSignOut">
      Sign out
    </button>
  </div>
  <div v-else class="sign-in-atproto">
    <div class="join">
      <input
        v-model="inputHandle"
        class="input input-sm join-item"
        type="text"
        placeholder="alice.bsky.social"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="atproto-handle-suggestions"
        :aria-expanded="suggestOpen"
        :aria-activedescendant="
          activeIndex >= 0 ? `atproto-suggestion-${activeIndex}` : undefined
        "
        autocapitalize="off"
        autocorrect="off"
        autocomplete="off"
        spellcheck="false"
        :disabled="redirecting"
        @input="onInput"
        @keydown.enter.prevent="onSubmit"
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.esc.prevent="closeSuggestions"
        @blur="closeSuggestions"
      />
      <button
        class="btn input-sm join-item"
        :disabled="redirecting"
        @click="onSubmit"
      >
        <template v-if="redirecting">Redirecting…</template>
        <template v-else>
          Sign in with
          <svg
            width="20"
            height="20"
            viewBox="0 0 600 530"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z"
              fill="#1185fe"
            />
          </svg>
        </template>
      </button>
    </div>

    <ul
      v-if="suggestOpen"
      id="atproto-handle-suggestions"
      class="suggestions"
      role="listbox"
      aria-label="Matching handles"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :id="`atproto-suggestion-${index}`"
        :key="suggestion.did"
        class="suggestion"
        :class="{ active: index === activeIndex }"
        role="option"
        :aria-selected="index === activeIndex"
        @mousedown.prevent="pick(suggestion)"
        @mouseenter="activeIndex = index"
      >
        <img
          v-if="suggestion.avatar"
          class="suggestion-avatar"
          :src="suggestion.avatar"
          alt=""
          loading="lazy"
        />
        <span v-else class="suggestion-avatar placeholder" aria-hidden="true"></span>
        <span class="suggestion-text">
          <span class="suggestion-handle">{{ suggestion.handle }}</span>
          <span v-if="suggestion.displayName" class="suggestion-name">
            {{ suggestion.displayName }}
          </span>
        </span>
      </li>
    </ul>
  </div>
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

.suggestions {
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

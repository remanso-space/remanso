<script setup lang="ts">
import { useForm } from "@/hooks/useForm.hook"

withDefaults(
  defineProps<{
    /** Tighter padding, for the form that sits inside a card rather than a hero. */
    compact?: boolean
    submitLabel?: string
  }>(),
  { compact: false, submitLabel: "→" }
)

const { userInput, repoInput, submit } = useForm()
</script>

<template>
  <form class="gh-form" :class="{ compact }" @submit.prevent="submit">
    <label class="input gh-input-group">
      <span class="gh-prefix mono">github/</span>
      <input
        v-model="userInput"
        placeholder="user"
        class="gh-input"
        spellcheck="false"
        autocapitalize="off"
      />
      <span class="gh-slash">/</span>
      <input
        v-model="repoInput"
        placeholder="repo"
        class="gh-input"
        spellcheck="false"
        autocapitalize="off"
      />
    </label>
    <button type="submit" class="hw-btn hw-btn-pink gh-go">
      {{ submitLabel }}
    </button>
  </form>
</template>

<style scoped lang="scss">
.gh-form {
  display: flex;
  align-items: stretch;

  &.compact {
    .gh-input-group {
      padding: 0.15rem 0.35rem 0.15rem 0.75rem;
    }

    .gh-go {
      padding: 0.3rem 0.7rem;
      font-size: 0.85rem;
    }
  }
}

.gh-input-group {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.45rem 0.35rem 0.9rem;
  background: var(--hw-surface);
  border: 1px solid var(--hw-rule);
  border-right: none;
  border-radius: 999px 0 0 999px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.02),
    0 6px 18px -10px rgba(201, 74, 125, 0.15);
  cursor: text;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  height: auto;
  outline: none;

  &:focus-within {
    border-color: var(--hw-pink);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 10px 28px -10px rgba(201, 74, 125, 0.25);
    outline: none;
  }
}

.gh-prefix {
  color: var(--hw-ink-faint);
  font-size: 0.85rem;
  user-select: none;
}

.gh-slash {
  color: var(--hw-ink-faint);
  font-family: var(--hw-mono);
}

.gh-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--hw-mono);
  font-size: 0.95rem;
  color: var(--hw-ink);
  padding: 0;

  &::placeholder {
    color: var(--hw-ink-faint);
    font-style: italic;
  }
}

.hw-btn.gh-go {
  flex-shrink: 0;
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  border-radius: 0 999px 999px 0;
  align-self: stretch;
  display: flex;
  align-items: center;
}
</style>

<script setup lang="ts">
import { computed } from "vue"

import SignInAtproto from "@/components/SignInAtproto.vue"
import SignInGithub from "@/components/SignInGithub.vue"
import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"

const { accessToken } = useGitHubLogin()
const isGitHubLoggedIn = computed(() => !!accessToken.value)
</script>

<template>
  <dialog id="profile_modal" class="modal profile-modal">
    <div class="modal-box profile-modal-box">
      <div class="profile-modal-head">
        <h3>Profile</h3>
        <form method="dialog">
          <button class="profile-modal-x" aria-label="close">×</button>
        </form>
      </div>
      <div class="profile-modal-section">
        <div class="profile-modal-label">Bluesky / ATProto</div>
        <sign-in-atproto :with-sign-out="true" />
      </div>
      <hr class="profile-modal-rule" />
      <div class="profile-modal-section">
        <div class="profile-modal-label">GitHub</div>
        <sign-in-github />
        <router-link
          v-if="isGitHubLoggedIn"
          :to="{ name: 'RepoList' }"
          class="profile-modal-link"
          >Manage your repos</router-link
        >
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button></button>
    </form>
  </dialog>
</template>

<style scoped lang="scss">
.profile-modal {
  --pm-rule: color-mix(
    in oklch,
    var(--color-base-content) 12%,
    var(--color-base-200)
  );
  --pm-ink: var(--color-base-content);
  --pm-ink-soft: color-mix(
    in oklch,
    var(--color-base-content) 65%,
    var(--color-base-200)
  );
  --pm-ink-faint: color-mix(
    in oklch,
    var(--color-base-content) 38%,
    var(--color-base-200)
  );
  --pm-accent: #e36598;
  --pm-accent-wash: color-mix(in oklch, #e36598 12%, var(--color-base-200));
  --pm-accent-deep: color-mix(
    in oklch,
    #e36598 75%,
    var(--color-base-content)
  );
}

.profile-modal-box {
  background: var(--color-base-200);
  border: 1px solid var(--pm-rule);
  border-radius: 6px;
  padding: 1.5rem;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.3);
  color: var(--pm-ink);
}

.profile-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h3 {
    font-size: 1.3rem;
    margin: 0;
    font-weight: 600;
  }
}

.profile-modal-x {
  border: 0;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--pm-ink-soft);
  line-height: 1;
  padding: 0.25rem 0.5rem;

  &:hover {
    color: var(--pm-accent-deep);
  }
}

.profile-modal-section {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.profile-modal-label {
  display: block;
  width: 100%;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--pm-ink-faint);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
}

.profile-modal-rule {
  border: 0;
  border-top: 1px solid var(--pm-rule);
  margin: 1.25rem 0;
}

.profile-modal-link {
  font-size: 16px;
  padding: 0.55rem 1rem;
  border-radius: 2px;
  border: 1px solid var(--pm-rule);
  background: transparent;
  color: var(--pm-ink-soft);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: var(--pm-accent-wash);
    border-color: var(--pm-accent);
    color: var(--pm-accent-deep);
  }
}
</style>

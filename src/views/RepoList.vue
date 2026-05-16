<script lang="ts" setup>
import { vInfiniteScroll } from "@vueuse/components"
import fontColorContrast from "font-color-contrast"
import { getHex } from "pastel-color"
import { computed, ref } from "vue"

import SignInAtproto from "@/components/SignInAtproto.vue"
import SignInGithub from "@/components/SignInGithub.vue"
import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { useRepos } from "@/hooks/useRepos.hook"
import { useRepoList } from "@/modules/repo/hooks/useRepoList.hook"
import type { RepoBase } from "@/modules/repo/interfaces/RepoBase"

const { username, accessToken } = useGitHubLogin()
const { isLoggedIn: isATProtoLoggedIn, handle, avatarUrl } = useATProtoLogin()
const { isReady, hasCredentialError } = useRepos()
const {
  favoriteRepos,
  otherRepos,
  favoriteCheckboxes,
  toggleCheckbox,
  canLoadMore,
  loadMore
} = useRepoList()

const isGitHubLoggedIn = computed(() => !!accessToken.value)
const isAnyUserLoggedIn = computed(
  () => isGitHubLoggedIn.value || isATProtoLoggedIn.value
)
const displayUsername = computed(() => username.value || handle.value || "")
const displayInitial = computed(() =>
  (displayUsername.value[0] || "?").toUpperCase()
)

const filterQuery = ref("")
const normalizedQuery = computed(() => filterQuery.value.trim().toLowerCase())
const matchesQuery = (name: string) =>
  normalizedQuery.value === "" ||
  name.toLowerCase().includes(normalizedQuery.value)

const filteredFavoriteRepos = computed<RepoBase[]>(() =>
  favoriteRepos.value.filter((r) => matchesQuery(r.name))
)
const filteredOtherRepos = computed<RepoBase[]>(() =>
  otherRepos.value.filter((r) => matchesQuery(r.name))
)

const groupedOtherRepos = computed<
  Array<{ letter: string; repos: RepoBase[] }>
>(() => {
  const groups = new Map<string, RepoBase[]>()
  const sorted = [...filteredOtherRepos.value].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
  for (const repo of sorted) {
    const ch = repo.name[0]?.toUpperCase() ?? "#"
    const letter = /[A-Z]/.test(ch) ? ch : "#"
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter)!.push(repo)
  }
  return [...groups.entries()].map(([letter, repos]) => ({ letter, repos }))
})

const tileStyle = (seed: string) => {
  const bg = getHex(seed)
  return { backgroundColor: bg, color: fontColorContrast(bg) }
}

const isStarred = (repo: RepoBase) => favoriteCheckboxes.value.includes(repo.id)
</script>

<template>
  <div
    class="repo-list-page"
    v-infinite-scroll="[loadMore, { canLoadMore: () => canLoadMore }]"
  >
    <!-- ── Top Nav ─────────────────────────────────────────── -->
    <nav class="topnav">
      <div class="topnav-left">
        <router-link :to="{ name: 'Home' }" class="brand">
          <img
            src="/favicon.png"
            alt="Remanso"
            class="brand-mark"
            width="28"
            height="28"
          />
          <span class="brand-word">Remanso</span>
        </router-link>
      </div>
      <div class="topnav-right">
        <router-link :to="{ name: 'Home' }" class="navlink">Home</router-link>
        <router-link :to="{ name: 'PublicNoteListView' }" class="navlink"
          >Public&nbsp;notes</router-link
        >
        <router-link
          :to="{
            name: 'FluxNoteView',
            params: { user: 'remanso-space', repo: 'getting-started' }
          }"
          class="navlink"
          >Getting&nbsp;started</router-link
        >
        <button
          v-if="isAnyUserLoggedIn"
          class="profile-chip"
          onclick="profile_modal.showModal()"
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
          class="hw-btn hw-btn-ghost"
          onclick="profile_modal.showModal()"
        >
          Sign in
        </button>
      </div>
    </nav>

    <!-- ── Main ────────────────────────────────────────────── -->
    <main>
      <!-- Hero -->
      <section class="rl-hero">
        <div class="rl-hero-inner">
          <div class="eyebrow mono">manage your repos</div>
          <h1 class="li-h1">Your repositories</h1>
          <p class="li-sub">
            <span class="mono"
              >{{ favoriteRepos.length }} starred
              <span class="li-dot">·</span>
              {{ otherRepos.length }} in your account</span
            >
            <span class="li-dot">·</span>
            <router-link :to="{ name: 'Home' }" class="li-sub-link"
              >← back to home</router-link
            >
          </p>
        </div>
      </section>

      <!-- Filter -->
      <section class="rl-filter-wrap" v-if="isReady && !hasCredentialError">
        <label class="rl-filter">
          <span class="rl-filter-prefix mono">filter</span>
          <input
            v-model="filterQuery"
            type="text"
            class="rl-filter-input"
            placeholder="repo name…"
            spellcheck="false"
            autocapitalize="off"
          />
          <button
            v-if="filterQuery"
            type="button"
            class="rl-clear-btn"
            aria-label="Clear filter"
            @click="filterQuery = ''"
          >
            ×
          </button>
        </label>
      </section>

      <!-- Loading state -->
      <section class="rl-section" v-if="!isReady">
        <div class="section-label mono">§ loading repos</div>
        <div class="favs-grid">
          <div
            v-for="i in 6"
            :key="i"
            class="repo-tile repo-tile--skel"
            aria-hidden="true"
          >
            <span class="skel skel-handle" />
            <span class="skel skel-title" />
          </div>
        </div>
      </section>

      <!-- Credential-error state -->
      <section class="rl-section" v-else-if="hasCredentialError">
        <div class="rl-card">
          <div class="eyebrow mono">sign in needed</div>
          <h2 class="rl-card-title">GitHub credentials expired</h2>
          <p class="rl-card-body">
            Your GitHub session is no longer valid. Sign back in to load and
            manage your repositories.
          </p>
          <sign-in-github />
        </div>
      </section>

      <!-- Repos -->
      <template v-else>
        <!-- Favorites -->
        <section class="rl-section">
          <div class="section-label mono">§ starred</div>
          <p
            v-if="filteredFavoriteRepos.length === 0 && filterQuery"
            class="rl-empty"
          >
            nothing matches &ldquo;{{ filterQuery }}&rdquo; in your starred
            repos.
          </p>
          <p v-else-if="favoriteRepos.length === 0" class="rl-empty">
            no starred repos yet — tap a ★ below to pin one here.
          </p>
          <div v-else class="favs-grid">
            <router-link
              v-for="repo in filteredFavoriteRepos"
              :key="repo.id"
              class="repo-tile"
              :style="tileStyle(`${repo.name}-${username}`)"
              :to="{
                name: 'FluxNoteView',
                params: { user: username, repo: repo.name }
              }"
            >
              <div class="tile-top">
                <span class="tile-owner mono">{{ username }}/</span>
                <span class="tile-name">{{ repo.name }}</span>
              </div>
              <button
                type="button"
                class="tile-star tile-star--on"
                aria-pressed="true"
                aria-label="Unstar"
                @click.stop.prevent="toggleCheckbox(repo)"
              >
                ★
              </button>
              <span
                v-if="repo.isPrivate"
                class="tile-lock"
                aria-label="Private"
                title="Private repo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"
                  />
                  <path d="M11 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                  <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
                </svg>
              </span>
            </router-link>
          </div>
        </section>

        <!-- Others — A–Z -->
        <section class="rl-section rl-others">
          <div class="section-label mono">§ all repos</div>
          <p
            v-if="groupedOtherRepos.length === 0 && filterQuery"
            class="rl-empty"
          >
            nothing matches &ldquo;{{ filterQuery }}&rdquo;.
          </p>
          <p v-else-if="otherRepos.length === 0" class="rl-empty">
            no other repos in your account.
          </p>
          <div v-else class="rl-letter-stack">
            <div
              v-for="group in groupedOtherRepos"
              :key="group.letter"
              class="rl-letter-group"
            >
              <div class="rl-letter mono">{{ group.letter }}</div>
              <ul class="rl-rows">
                <li v-for="repo in group.repos" :key="repo.id" class="rl-row">
                  <button
                    type="button"
                    class="row-star"
                    :class="{ 'row-star--on': isStarred(repo) }"
                    :aria-pressed="isStarred(repo)"
                    :aria-label="isStarred(repo) ? 'Unstar' : 'Star'"
                    @click="toggleCheckbox(repo)"
                  >
                    {{ isStarred(repo) ? "★" : "☆" }}
                  </button>
                  <router-link
                    class="rl-row-name"
                    :to="{
                      name: 'FluxNoteView',
                      params: { user: username, repo: repo.name }
                    }"
                  >
                    {{ repo.name }}
                  </router-link>
                  <span
                    v-if="repo.isPrivate"
                    class="row-lock"
                    aria-label="Private"
                    title="Private repo"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"
                      />
                      <path d="M11 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                      <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
                    </svg>
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p v-if="canLoadMore" class="rl-loading-more mono">loading…</p>
        </section>
      </template>
    </main>

    <!-- ── Profile modal ──────────────────────────────────── -->
    <dialog id="profile_modal" class="modal hw-modal">
      <div class="modal-box hw-modal-box">
        <div class="hw-modal-head">
          <h3>Profile</h3>
          <form method="dialog">
            <button class="hw-modal-x" aria-label="close">×</button>
          </form>
        </div>
        <div class="hw-modal-section">
          <div class="hw-ms-label mono">Bluesky / ATProto</div>
          <sign-in-atproto :with-sign-out="true" />
        </div>
        <hr class="hw-rule" />
        <div class="hw-modal-section">
          <div class="hw-ms-label mono">GitHub</div>
          <sign-in-github />
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button></button>
      </form>
    </dialog>
  </div>
</template>

<style lang="scss" scoped>
/* ── Tokens ────────────────────────────────────────────────── */
.repo-list-page {
  --hw-surface: var(--color-base-100);
  --hw-paper: var(--color-base-200);
  --hw-paper-warm: var(--color-base-300);
  --hw-ink: var(--color-base-content);
  --hw-ink-soft: color-mix(
    in oklch,
    var(--color-base-content) 65%,
    var(--color-base-200)
  );
  --hw-ink-faint: color-mix(
    in oklch,
    var(--color-base-content) 38%,
    var(--color-base-200)
  );
  --hw-rule: color-mix(
    in oklch,
    var(--color-base-content) 12%,
    var(--color-base-200)
  );

  --hw-pink: #e36598;
  --hw-pink-deep: color-mix(in oklch, #e36598 75%, var(--color-base-content));
  --hw-pink-wash: color-mix(in oklch, #e36598 12%, var(--color-base-200));
  --hw-pink-wash-2: color-mix(in oklch, #e36598 22%, var(--color-base-200));
  --hw-serif: "Libertinus Serif", "Iowan Old Style", "Palatino", serif;
  --hw-mono: "Courier Prime", "IBM Plex Mono", ui-monospace, monospace;

  font-family: var(--hw-serif);
  background: var(--hw-paper);
  color: var(--hw-ink);
  font-size: 18px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  min-height: 100dvh;
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
}

.repo-list-page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(
      circle at 20% 10%,
      rgba(227, 101, 152, 0.04),
      transparent 40%
    ),
    radial-gradient(
      circle at 90% 80%,
      rgba(107, 142, 78, 0.035),
      transparent 45%
    );
}

main {
  position: relative;
  flex: 1;
}

/* ── Shared buttons ────────────────────────────────────────── */
.hw-btn {
  font-family: var(--hw-serif);
  font-size: 16px;
  padding: 0.55rem 1rem;
  border-radius: 2px;
  border: 1px solid var(--hw-ink);
  background: transparent;
  color: var(--hw-ink);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.1s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: var(--hw-ink);
    color: var(--hw-paper);
  }

  &:active {
    transform: translateY(1px);
  }
}

.hw-btn-ghost {
  border-color: var(--hw-rule);
  color: var(--hw-ink-soft);

  &:hover {
    background: var(--hw-pink-wash);
    border-color: var(--hw-pink);
    color: var(--hw-pink-deep);
  }
}

.mono {
  font-family: var(--hw-mono);
}

.hw-rule {
  border: 0;
  border-top: 1px solid var(--hw-rule);
  margin: 1.25rem 0;
}

/* ── Top nav ───────────────────────────────────────────────── */
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid var(--hw-rule);
  background: var(--hw-paper);
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: saturate(1.1) blur(6px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  text-decoration: none;
  color: var(--hw-ink);
}

.brand-mark {
  display: block;
  object-fit: contain;
  view-transition-name: remanso-logo;
  border: 0;
  box-shadow: none;
}

.brand-word {
  font-size: 1.25rem;
  letter-spacing: 0.02em;
  font-weight: 600;
}

.topnav-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.navlink {
  text-decoration: none;
  color: var(--hw-ink-soft);
  font-size: 0.95rem;
  transition: color 0.15s;

  &:hover {
    color: var(--hw-pink-deep);
  }
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem 0.25rem 0.25rem;
  border-radius: 999px;
  border: 1px solid var(--hw-rule);
  background: transparent;
  cursor: pointer;
  font-family: var(--hw-serif);
  color: var(--hw-ink);
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: var(--hw-pink);
    background: var(--hw-pink-wash);
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
  background: var(--hw-pink);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--hw-serif);
  font-weight: 600;
  font-size: 0.9rem;
}

.profile-name {
  font-size: 0.95rem;
}

/* ── Hero ──────────────────────────────────────────────────── */
.rl-hero {
  padding: 3rem 2rem 1rem;
}

.rl-hero-inner {
  max-width: 1180px;
  margin: 0 auto;
}

.eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hw-pink-deep);
  margin-bottom: 1rem;
}

.li-h1 {
  font-family: var(--hw-serif);
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 600;
  margin: 0.25rem 0 0.75rem;
  letter-spacing: -0.005em;
}

.li-sub {
  margin: 0;
  color: var(--hw-ink-soft);
  font-size: 0.95rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
}

.li-dot {
  color: var(--hw-ink-faint);
}

.li-sub-link {
  color: var(--hw-ink-soft);
  text-decoration: underline;
  text-decoration-color: var(--hw-rule);

  &:hover {
    color: var(--hw-pink-deep);
  }
}

/* ── Filter ────────────────────────────────────────────────── */
.rl-filter-wrap {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0.5rem 2rem 0;
}

.rl-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.45rem 0.35rem 0.95rem;
  background: var(--hw-surface);
  border: 1px solid var(--hw-rule);
  border-radius: 999px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.02),
    0 6px 18px -10px rgba(201, 74, 125, 0.15);
  cursor: text;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  min-width: min(360px, 100%);

  &:focus-within {
    border-color: var(--hw-pink);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 10px 28px -10px rgba(201, 74, 125, 0.25);
  }
}

.rl-filter-prefix {
  color: var(--hw-ink-faint);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  user-select: none;
}

.rl-filter-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--hw-mono);
  font-size: 0.95rem;
  color: var(--hw-ink);
  padding: 0.15rem 0;

  &::placeholder {
    color: var(--hw-ink-faint);
    font-style: italic;
  }
}

.rl-clear-btn {
  flex-shrink: 0;
  width: 1.6rem;
  height: 1.6rem;
  border: 0;
  border-radius: 999px;
  background: var(--hw-pink-wash);
  color: var(--hw-pink-deep);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: var(--hw-pink);
    color: white;
  }
}

/* ── Sections ──────────────────────────────────────────────── */
.rl-section {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0.5rem 2rem 2rem;
}

.section-label {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: var(--hw-ink-faint);
  text-transform: lowercase;
  margin: 1.75rem 0 1rem;
}

.rl-empty {
  margin: 0.5rem 0 1rem;
  color: var(--hw-ink-faint);
  font-style: italic;
  font-size: 0.95rem;
}

/* ── Favorites grid ────────────────────────────────────────── */
.favs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.repo-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem 1.1rem;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease;
  min-height: 110px;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.15);
  }
}

.tile-top {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-right: 2rem;
}

.tile-owner {
  font-size: 0.75rem;
  opacity: 0.65;
}

.tile-name {
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1.15;
  word-break: break-word;
}

.tile-star {
  position: absolute;
  top: 0.55rem;
  right: 0.6rem;
  width: 1.9rem;
  height: 1.9rem;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--hw-pink-deep);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  transition:
    background 0.15s,
    transform 0.1s;

  &:hover {
    background: white;
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

.tile-lock {
  position: absolute;
  bottom: 0.55rem;
  right: 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.75;
  user-select: none;
}

/* ── Skeleton ──────────────────────────────────────────────── */
.repo-tile--skel {
  background: var(--hw-surface);
  border-color: var(--hw-rule);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.1rem;
  justify-content: flex-start;
}

.skel {
  display: block;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    var(--hw-pink-wash) 0%,
    var(--hw-pink-wash-2) 50%,
    var(--hw-pink-wash) 100%
  );
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s ease-in-out infinite;
}

.skel-handle {
  height: 0.6rem;
  width: 45%;
}

.skel-title {
  height: 1.1rem;
  width: 75%;
}

@keyframes skel-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ── Credential-error card ─────────────────────────────────── */
.rl-card {
  max-width: 560px;
  padding: 2rem 2rem 1.75rem;
  background: var(--hw-surface);
  border: 1px solid var(--hw-rule);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rl-card-title {
  font-family: var(--hw-serif);
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0;
}

.rl-card-body {
  margin: 0 0 0.5rem;
  color: var(--hw-ink-soft);
  font-size: 1rem;
  line-height: 1.55;
}

/* ── Others (A–Z) ──────────────────────────────────────────── */
.rl-letter-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.rl-letter-group {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0.5rem 1rem;
  align-items: start;
}

.rl-letter {
  font-size: 1.4rem;
  color: var(--hw-pink-deep);
  letter-spacing: 0.05em;
  font-weight: 600;
  padding-top: 0.45rem;
  text-align: right;
  border-right: 1px dashed var(--hw-rule);
  padding-right: 0.75rem;
  position: sticky;
  top: calc(72px + 0.5rem);
}

.rl-rows {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rl-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px dashed var(--hw-rule);
  border-radius: 4px;
  transition: background 0.15s ease;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--hw-pink-wash);
  }
}

.row-star {
  flex-shrink: 0;
  width: 1.8rem;
  height: 1.8rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--hw-ink-faint);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.1s;

  &:hover {
    color: var(--hw-pink-deep);
    background: var(--hw-pink-wash-2);
  }

  &:active {
    transform: scale(0.92);
  }

  &.row-star--on {
    color: var(--hw-pink-deep);
  }
}

.rl-row-name {
  flex: 1;
  min-width: 0;
  color: var(--hw-ink);
  text-decoration: none;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--hw-pink-deep);
  }
}

.row-lock {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--hw-ink-faint);
  user-select: none;
}

.rl-loading-more {
  margin: 1.5rem 0 0;
  text-align: center;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  color: var(--hw-ink-faint);
  text-transform: lowercase;
}

/* ── Profile modal ─────────────────────────────────────────── */
.hw-modal .hw-modal-box {
  background: var(--hw-paper);
  border: 1px solid var(--hw-rule);
  border-radius: 6px;
  padding: 1.5rem;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.3);
  color: var(--hw-ink);
  font-family: var(--hw-serif);
}

.hw-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h3 {
    font-family: var(--hw-serif);
    font-size: 1.3rem;
    margin: 0;
    font-weight: 600;
  }
}

.hw-modal-x {
  border: 0;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--hw-ink-soft);
  line-height: 1;
  padding: 0.25rem 0.5rem;

  &:hover {
    color: var(--hw-pink-deep);
  }
}

.hw-modal-section {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.hw-ms-label {
  display: block;
  width: 100%;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--hw-ink-faint);
  margin-bottom: 0.25rem;
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .favs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .topnav {
    padding: 1rem 1.25rem;
  }

  .navlink {
    display: none;
  }

  .rl-hero,
  .rl-filter-wrap,
  .rl-section {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .rl-letter-group {
    grid-template-columns: 2rem 1fr;
    gap: 0.4rem 0.75rem;
  }

  .rl-letter {
    font-size: 1.15rem;
    padding-right: 0.4rem;
  }
}

@media (max-width: 520px) {
  .favs-grid {
    grid-template-columns: 1fr;
  }
}
</style>

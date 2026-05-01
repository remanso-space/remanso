<script lang="ts" setup>
import fontColorContrast from "font-color-contrast"
import { getHex } from "pastel-color"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import SignInAtproto from "@/components/SignInAtproto.vue"
import SignInGithub from "@/components/SignInGithub.vue"
import ThemeSwap from "@/components/ThemeSwap.vue"
import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useForm } from "@/hooks/useForm.hook"
import { useGitHubLogin } from "@/hooks/useGitHubLogin.hook"
import { useNeedReviewCards } from "@/modules/card/hooks/useNeedReviewCards"
import { useLastVisitedRepos } from "@/modules/history/hooks/useLastVisitedRepos.hook"
import { useFavoriteRepos } from "@/modules/repo/hooks/useFavoriteRepos.hook"

const { username, accessToken } = useGitHubLogin()
const { isLoggedIn: isATProtoLoggedIn, handle, avatarUrl } = useATProtoLogin()
const { userInput, repoInput, submit } = useForm()
const { savedFavoriteRepos } = useFavoriteRepos()
const { lastVisitedRepos } = useLastVisitedRepos()
const { cardsToReview } = useNeedReviewCards()
const router = useRouter()

const isGitHubLoggedIn = computed(() => !!accessToken.value)
const isAnyUserLoggedIn = computed(
  () => isGitHubLoggedIn.value || isATProtoLoggedIn.value
)
const displayUsername = computed(() => username.value || handle.value || "")
const displayInitial = computed(() =>
  (displayUsername.value[0] || "?").toUpperCase()
)

const tileStyle = (seed: string) => {
  const bg = getHex(seed)
  return { backgroundColor: bg, color: fontColorContrast(bg) }
}

const openRepo = (user: string, repo: string) => {
  router.push({ name: "FluxNoteView", params: { user, repo } })
}

const greeting = computed(() => {
  const h = new Date().getHours()
  const name = displayUsername.value
  if (h < 6) return `Still up${name ? ", " + name : ""}?`
  if (h < 12) return `Good morning${name ? ", " + name : ""}.`
  if (h < 18) return `Good afternoon${name ? ", " + name : ""}.`
  return `Good evening${name ? ", " + name : ""}.`
})

const today = computed(() =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  })
)

const offsetHighlighted = ref(false)
const flashOffset = () => {
  offsetHighlighted.value = true
  setTimeout(() => {
    offsetHighlighted.value = false
  }, 900)
}

const firstHighlighted = ref(false)
const flashFirst = () => {
  firstHighlighted.value = true
  setTimeout(() => {
    firstHighlighted.value = false
  }, 900)
}

const zettelRevealed = ref(false)
const toggleZettel = () => {
  zettelRevealed.value = !zettelRevealed.value
}

const reviewRepo = computed(() => savedFavoriteRepos.value[0] ?? null)
const showReviewCard = computed(
  () => cardsToReview.value.length > 0 && reviewRepo.value !== null
)
</script>

<template>
  <div class="welcome-world">
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
        <a href="#about" class="navlink">About</a>
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

    <!-- ── Main content ───────────────────────────────────── -->
    <main>
      <!-- =========== LOGGED-IN: Launchpad ============== -->
      <template v-if="isAnyUserLoggedIn">
        <section class="li-hero">
          <div class="li-hero-inner">
            <div>
              <div class="eyebrow mono">the pool is calm today</div>
              <h1 class="li-h1">{{ greeting }}</h1>
              <p class="li-sub">
                <span class="mono">{{ today }}</span>
                <span class="li-dot">·</span>
                <router-link
                  :to="{ name: 'PublicNoteListView' }"
                  class="li-sub-link"
                  >Public notes</router-link
                >
              </p>
            </div>
            <div class="li-quick">
              <div class="li-quick-label mono">jump to a repo</div>
              <form class="gh-form compact" @submit.prevent="submit">
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
                  →
                </button>
              </form>
            </div>
          </div>
        </section>

        <section class="li-main">
          <div class="li-grid">
            <!-- Left: Repos -->
            <div>
              <div class="section-label mono" style="margin-top: 0">
                § your repos
              </div>
              <div
                v-if="savedFavoriteRepos.length"
                class="favs-grid"
                :class="{ 'single-col': savedFavoriteRepos.length === 1 }"
              >
                <a
                  v-for="(repo, i) in savedFavoriteRepos"
                  :key="repo._id"
                  class="repo-tile"
                  :class="{
                    'size-xl': i === 0 && savedFavoriteRepos.length > 1,
                    'size-lg': i > 0 || savedFavoriteRepos.length === 1,
                    featured: i === 0 && savedFavoriteRepos.length > 1
                  }"
                  :style="tileStyle(`${repo.name}-${username}`)"
                  href="#"
                  @click.prevent="openRepo(String(username), repo.name)"
                >
                  <div class="tile-top">
                    <span class="tile-owner mono">{{ username }}/</span>
                    <span class="tile-name">{{ repo.name }}</span>
                  </div>
                </a>
                <router-link
                  :to="{ name: 'RepoList' }"
                  class="add-tile"
                  title="Manage repos"
                >
                  <span class="plus">+</span>
                  <span>manage repos</span>
                </router-link>
              </div>
              <div v-else class="empty-repos">
                <p>No repos saved yet.</p>
                <router-link :to="{ name: 'RepoList' }" class="hw-btn">
                  Add a repo
                </router-link>
                <div class="section-label mono" style="margin-top: 1.5rem">
                  or open one directly
                </div>
                <form class="gh-form" @submit.prevent="submit">
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
                    Open →
                  </button>
                </form>
              </div>
            </div>

            <!-- Right: Sidebar -->
            <aside>
              <div
                v-if="lastVisitedRepos.length"
                class="section-label mono"
                style="margin-top: 0"
              >
                § last visited
              </div>
              <ul v-if="lastVisitedRepos.length" class="recent-list">
                <li
                  v-for="repo in lastVisitedRepos.slice(0, 5)"
                  :key="`${repo.user}-${repo.repo}`"
                >
                  <router-link
                    :to="{
                      name: 'FluxNoteView',
                      params: { user: repo.user, repo: repo.repo }
                    }"
                  >
                    <span class="r-path mono"
                      >{{ repo.user }} / {{ repo.repo }}</span
                    >
                  </router-link>
                </li>
              </ul>

              <template v-if="showReviewCard">
                <div class="section-label mono">§ due for review</div>
                <div class="due-card">
                  <div class="due-count">{{ cardsToReview.length }}</div>
                  <div>
                    <div class="due-t">Cards waiting</div>
                    <div class="due-d">Spaced repetition</div>
                  </div>
                  <router-link
                    :to="{
                      name: 'NeedReviewCards',
                      params: {
                        user: username,
                        repo: reviewRepo!.name
                      }
                    }"
                    class="hw-btn hw-btn-pink due-btn"
                  >
                    Review →
                  </router-link>
                </div>
              </template>

              <div class="section-label mono">§ from the network</div>
              <router-link
                :to="{ name: 'PublicNoteListView' }"
                class="hw-btn pub-notes-btn"
              >
                Browse public notes →
              </router-link>
            </aside>
          </div>
        </section>
      </template>

      <!-- =========== Editorial (always visible) ============== -->
      <!-- Hero -->
      <section class="hero-ed">
        <div class="hero-ed-inner">
          <div class="hero-ed-left">
            <div class="eyebrow mono">a quiet place for your notes</div>
            <h1 class="display">
              Remanso is where your<br />
              <em>scattered thinking</em><br />
              comes to rest.
            </h1>
            <p class="lede">
              Point it at any markdown — a GitHub repo of your own, or public
              notes from the open ATProto network — and Remanso turns it into a
              calm, stackable notebook with backlinks where your thinking
              finally runs clear.
            </p>
            <div class="hero-ed-paths">
              <!-- CTA 01: GitHub repo -->
              <div class="hero-ed-path">
                <div class="hep-head">
                  <span class="hep-n mono">01</span>
                  <div>
                    <div class="hep-t">From a GitHub repo</div>
                    <div class="hep-d">
                      Point it at your markdown. Public works instantly, private
                      via OAuth.
                    </div>
                  </div>
                </div>
                <form class="gh-form" @submit.prevent="submit">
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
                    →
                  </button>
                </form>
              </div>
              <!-- CTA 02: Public notes -->
              <div class="hero-ed-path">
                <div class="hep-head">
                  <span class="hep-n mono">02</span>
                  <div>
                    <div class="hep-t">From the open network</div>
                    <div class="hep-d">
                      Your `.pub.md` files become public. Read public notes
                      published via ATProto — no account needed.
                    </div>
                  </div>
                </div>
                <router-link
                  :to="{ name: 'PublicNoteListView' }"
                  class="hw-btn hw-btn-pink hep-btn"
                >
                  Browse public notes →
                </router-link>
              </div>
            </div>
            <div class="hero-ed-sample mono">
              new here?
              <router-link
                :to="{
                  name: 'FluxNoteView',
                  params: { user: 'remanso-space', repo: 'getting-started' }
                }"
              >
                try remanso-space/getting-started →
              </router-link>
            </div>
          </div>
          <div class="hero-ed-right">
            <div class="flower-stage">
              <img
                src="/favicon.png"
                alt="Remanso"
                class="flower-mark"
                width="240"
                height="240"
              />
              <div class="flower-ripple" />
              <div class="flower-ripple r2" />
            </div>
          </div>
        </div>
      </section>

      <!-- Manifesto -->
      <section class="manifesto" id="about">
        <div class="manifesto-inner">
          <div class="section-label mono">§ 01 — what is remanso</div>
          <p class="drop-cap manifesto-p">
            <em>Remanso</em> is a Portuguese word for the still pool that forms
            where a river slows. The current still moves through — but for a
            moment, it is calm enough to see the bottom. This is what notes
            should feel like. A Remanso takes your markdown files and lays them
            out as a linked notebook you can read, follow, and add to. No
            lock-in. Your notes stay in Git.
          </p>
          <div class="feature-row">
            <div class="feat">
              <span class="feat-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 4l-8 4l8 4l8 -4l-8 -4" />
                  <path d="M4 12l8 4l8 -4" />
                  <path d="M4 16l8 4l8 -4" />
                </svg>
              </span>
              <h4>Stacked notes</h4>
              <p>
                Click a link and the next note slides in beside the current one.
                Your train of thought stays visible — never lose where you came
                from.
              </p>
            </div>
            <div class="feat">
              <span class="feat-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 14l-4 -4l4 -4" />
                  <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
                </svg>
              </span>
              <h4>Automatic backlinks</h4>
              <p>
                Every mention becomes a two-way link. See every note that points
                back at the one you're reading.
              </p>
            </div>
            <div class="feat">
              <span class="feat-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M15 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                  <path d="M11 8a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                  <path d="M11 16a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                  <path d="M12 15v-6" />
                  <path d="M15 11l-2 -2" />
                  <path d="M11 7l-1.9 -1.9" />
                  <path
                    d="M13.446 2.6l7.955 7.954a2.045 2.045 0 0 1 0 2.892l-7.955 7.955a2.045 2.045 0 0 1 -2.892 0l-7.955 -7.955a2.045 2.045 0 0 1 0 -2.892l7.955 -7.955a2.045 2.045 0 0 1 2.892 0"
                  />
                </svg>
              </span>
              <h4>Your files, your Git</h4>
              <p>
                Remanso reads GitHub directly. Edit in your favourite editor.
                Ship to Bluesky via ATProto when you're ready to share.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Demo notes -->
      <section class="demo" id="getting-started">
        <div class="demo-inner">
          <div class="section-label mono">§ 02 — a note, in full</div>
          <h2 class="h2">
            This is what a note looks like.<br />
            <span class="h2-quiet italic">
              Tap a link to stack another beside it.
            </span>
          </h2>
          <div class="demo-notes">
            <article
              class="note-preview"
              :class="{ 'note-preview--flash': firstHighlighted }"
            >
              <div class="note-header">
                <span class="mono note-breadcrumb"
                  >remanso-space / getting-started</span
                >
              </div>
              <h3 class="note-title">On keeping notes</h3>
              <div class="note-body">
                <p>
                  A note should be small enough to hold one idea and
                  <a class="note-link" href="#" @click.prevent="flashOffset"
                    >durable enough</a
                  >
                  to outlive the day it was written.
                </p>
                <p>
                  Luhmann called this the
                  <a class="note-link" href="#" @click.prevent="toggleZettel"
                    >zettelkasten</a
                  >: a slip-box of thoughts you converse with, rather than a
                  hoard of pages you re-read.
                </p>
              </div>
              <div class="note-backlinks">
                <div class="backlinks-h mono">↖ linked from</div>
                <ul>
                  <li>
                    <a @click.prevent href="#"
                      >why links are better than folders</a
                    >
                  </li>
                  <li><a @click.prevent href="#">a reading diary</a></li>
                </ul>
              </div>
            </article>
            <div class="note-stack">
              <article
                class="note-preview note-preview-offset"
                :class="{ 'note-preview--flash': offsetHighlighted }"
              >
                <div class="note-header">
                  <span class="mono note-breadcrumb"
                    >remanso-space / getting-started</span
                  >
                </div>
                <h3 class="note-title">Durable enough</h3>
                <div class="note-body">
                  <p>
                    A durable note survives its own context. You should be able
                    to pick it up six months from now and still know what it
                    means.
                  </p>
                  <p>
                    Rule of thumb: write the title as the claim, and the body as
                    the argument.
                  </p>
                </div>
                <div class="note-backlinks">
                  <div class="backlinks-h mono">↖ linked from</div>
                  <ul>
                    <li>
                      <a @click.prevent="flashFirst" href="#"
                        >on keeping notes</a
                      >
                    </li>
                  </ul>
                </div>
              </article>
              <article
                class="note-preview note-preview-zettel"
                :class="{ 'is-revealed': zettelRevealed }"
                :aria-hidden="!zettelRevealed"
              >
                <div class="note-header">
                  <span class="mono note-breadcrumb"
                    >remanso-space / getting-started</span
                  >
                </div>
                <h3 class="note-title">Zettelkasten</h3>
                <div class="note-body">
                  <p>
                    A <em>slip-box</em> of atomic notes wired together by links
                    instead of filed away in folders. Niklas Luhmann kept ninety
                    thousand of them in a wooden cabinet and wrote with them,
                    not just about them.
                  </p>
                  <p>
                    Each <em>Zettel</em> earns its keep by being linked to. Open
                    one, follow a thread, end up somewhere you didn't plan to
                    go.
                  </p>
                </div>
                <div class="note-backlinks">
                  <div class="backlinks-h mono">↖ linked from</div>
                  <ul>
                    <li><a @click.prevent href="#">on keeping notes</a></li>
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- Zettelkasten primer -->
      <section class="zk" id="zk">
        <div class="zk-inner">
          <div class="section-label mono">§ 03 — zettelkasten, in a minute</div>
          <ol class="zk-steps">
            <li>
              <span class="zk-n mono">01</span>
              <div>
                <h4>One idea per note.</h4>
                <p>Keep them small. A note that does one thing gets reused.</p>
              </div>
            </li>
            <li>
              <span class="zk-n mono">02</span>
              <div>
                <h4>Link, don't nest.</h4>
                <p>
                  Folders calcify. Links compound. Every
                  <code>[like this](new-idea.md)</code> becomes a door to a new
                  idea.
                </p>
              </div>
            </li>
            <li>
              <span class="zk-n mono">03</span>
              <div>
                <h4>Let the web emerge.</h4>
                <p>
                  Don't plan the structure. Write, link, re-read. Structure is a
                  consequence of attention.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>

    <!-- ── Footer ─────────────────────────────────────────── -->
    <footer class="page-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <img
            src="/favicon.png"
            alt="Remanso"
            width="32"
            height="32"
            class="footer-mark"
          />
          <div>
            <div class="footer-title">Remanso</div>
            <div class="footer-sub mono">a quiet pool for your notes</div>
          </div>
        </div>
        <div class="footer-cols">
          <div>
            <div class="footer-h">Product</div>
            <router-link
              :to="{
                name: 'FluxNoteView',
                params: { user: 'remanso-space', repo: 'getting-started' }
              }"
              class="footer-link"
              >Getting started</router-link
            >
            <router-link
              :to="{ name: 'PublicNoteListView' }"
              class="footer-link"
              >Public notes</router-link
            >
            <router-link :to="{ name: 'RepoList' }" class="footer-link"
              >Your repos</router-link
            >
          </div>
          <div>
            <div class="footer-h">Learn</div>
            <a href="#about" class="footer-link">What is Remanso?</a>
            <a href="#zk" class="footer-link">Zettelkasten</a>
            <a href="#" class="footer-link">ATProto &amp; Bluesky</a>
          </div>
        </div>
      </div>
      <div class="footer-fine">
        <theme-swap />
        <span>
          made with <span style="color: var(--hw-pink-deep)">♥</span> by
          <a
            href="https://apoena.dev"
            target="_blank"
            rel="noreferrer"
            class="footer-link"
            >apoena.dev ↗</a
          >
        </span>
      </div>
    </footer>

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
          <router-link
            v-if="isGitHubLoggedIn"
            :to="{ name: 'RepoList' }"
            class="hw-btn hw-btn-ghost"
            >Manage your repos</router-link
          >
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button></button>
      </form>
    </dialog>
  </div>
</template>

<style lang="scss" scoped>
/* ── CSS variables ─────────────────────────────────────────── */
.welcome-world {
  /* Derived from DaisyUI base tokens — adapts to any theme automatically.
     base-100 is the lightest surface; base-200/300 are progressively deeper.
     Paper uses base-200 so cards (base-100) appear slightly elevated above it. */
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

  /* Brand accent — intentionally fixed, not derived from the active theme */
  --hw-pink: #e36598;
  --hw-pink-deep: color-mix(in oklch, #e36598 75%, var(--color-base-content));
  --hw-pink-wash: color-mix(in oklch, #e36598 12%, var(--color-base-200));
  --hw-pink-wash-2: color-mix(in oklch, #e36598 22%, var(--color-base-200));
  --hw-leaf: #6b8e4e;
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
  display: flex;
  flex-direction: column;
  position: relative;
}

.welcome-world::before {
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

/* ── Shared button system ───────────────────────────────────── */
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

.hw-btn-primary {
  background: var(--hw-ink);
  color: var(--hw-paper);

  &:hover {
    background: var(--hw-pink-deep);
    border-color: var(--hw-pink-deep);
  }
}

.hw-btn-pink {
  background: var(--hw-pink);
  border-color: var(--hw-pink);
  color: #fff;

  &:hover {
    background: var(--hw-pink-deep);
    border-color: var(--hw-pink-deep);
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

/* ── Utility classes ────────────────────────────────────────── */
.mono {
  font-family: var(--hw-mono);
}

.italic {
  font-style: italic;
}

.drop-cap::first-letter {
  font-family: var(--hw-serif);
  float: left;
  font-size: 4.6em;
  line-height: 0.85;
  font-weight: 600;
  margin: 0.1em 0.1em 0 0;
  color: var(--hw-pink-deep);
}

.hw-rule {
  border: 0;
  border-top: 1px solid var(--hw-rule);
  margin: 1.25rem 0;
}

/* ── Top nav ────────────────────────────────────────────────── */
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

/* ── GitHub form ────────────────────────────────────────────── */
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

.gh-go {
  flex-shrink: 0;
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  border-radius: 0 999px 999px 0;
  align-self: stretch;
  display: flex;
  align-items: center;
}

/* ── Hero (logged out) ──────────────────────────────────────── */
.hero-ed {
  padding: 4.5rem 2rem 3rem;
}

.hero-ed-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 4rem;
  align-items: center;
}

.eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--hw-pink-deep);
  margin-bottom: 1.5rem;
}

.display {
  font-family: var(--hw-serif);
  font-size: clamp(2.5rem, 5.5vw, 4.6rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  margin: 0 0 1.75rem;
  font-weight: 600;
  text-wrap: balance;

  em {
    font-style: italic;
    font-weight: 400;
    color: var(--hw-pink-deep);
  }
}

.lede {
  font-size: 1.18rem;
  line-height: 1.55;
  color: var(--hw-ink-soft);
  max-width: 36ch;
  margin: 0 0 2rem;
  text-wrap: pretty;
}

.hero-ed-paths {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
}

.hero-ed-path {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2.25rem 2rem;
  background: var(--hw-surface);
  border: 1px solid var(--hw-rule);
  border-radius: 6px;
  transition:
    border-color 0.15s,
    box-shadow 0.2s,
    transform 0.15s;

  &:hover {
    border-color: var(--hw-pink-wash-2);
    box-shadow: 0 18px 30px -22px rgba(201, 74, 125, 0.18);
    transform: translateY(-1px);
  }
}

.hep-head {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.hep-n {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: var(--hw-pink-deep);
  padding-top: 0.35rem;
}

.hep-t {
  font-family: var(--hw-serif);
  font-size: 1.45rem;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 0.4rem;
}

.hep-d {
  font-size: 1.05rem;
  color: var(--hw-ink-soft);
  line-height: 1.55;
  text-wrap: pretty;
}

.hep-btn {
  align-self: flex-start;
  padding: 0.65rem 1.25rem;
  font-size: 1.05rem;
}

.hero-ed-sample {
  margin-top: 1.1rem;
  font-size: 0.8rem;
  color: var(--hw-ink-faint);

  a {
    color: var(--hw-ink-soft);
    text-decoration: underline;
    text-decoration-color: var(--hw-rule);

    &:hover {
      color: var(--hw-pink-deep);
    }
  }
}

.hero-ed-right {
  display: flex;
  justify-content: center;
}

.flower-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.flower-mark {
  position: relative;
  z-index: 2;
  display: block;
  object-fit: contain;
}

.flower-ripple {
  position: absolute;
  inset: 10% 10%;
  border: 4px solid var(--hw-pink-wash-2);
  border-radius: 50%;
  animation: ripple 4.5s ease-out infinite;

  &.r2 {
    animation-delay: 1.8s;
  }
}

@keyframes ripple {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  30% {
    opacity: 0.6;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

/* ── Manifesto ──────────────────────────────────────────────── */
.manifesto {
  padding: 2rem 2rem 3rem;
  border-top: 1px solid var(--hw-rule);
}

.manifesto-inner {
  max-width: 760px;
  margin: 0 auto;
}

.section-label {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: var(--hw-ink-faint);
  text-transform: lowercase;
  margin: 2.75rem 0 1.5rem;
}

.manifesto-p {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--hw-ink);
  text-wrap: pretty;
  margin: 0;

  em {
    font-style: italic;
    color: var(--hw-pink-deep);
  }
}

.feature-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.25rem;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--hw-rule);
}

.feat {
  h4 {
    font-size: 1.05rem;
    margin: 0.6rem 0 0.35rem;
    font-weight: 600;
  }

  p {
    font-size: 0.95rem;
    color: var(--hw-ink-soft);
    line-height: 1.55;
    margin: 0;
    text-wrap: pretty;
  }
}

.feat-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--hw-pink-deep);
  border: 1px solid var(--hw-pink);
  border-radius: 50%;

  svg {
    width: 16px;
    height: 16px;
  }
}

/* ── Demo notes ─────────────────────────────────────────────── */
.demo {
  padding: 2rem 2rem 4rem;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in srgb, var(--hw-pink-wash) 35%, transparent) 40%,
    transparent
  );
}

.demo-inner {
  max-width: 1080px;
  margin: 0 auto;
}

.h2 {
  font-family: var(--hw-serif);
  font-size: clamp(1.8rem, 3.2vw, 2.6rem);
  line-height: 1.15;
  font-weight: 600;
  margin: 0 0 2.5rem;
  letter-spacing: -0.005em;
}

.h2-quiet {
  font-weight: 400;
  color: var(--hw-ink-soft);
}

.demo-notes {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
}

.note-preview {
  background: var(--hw-surface);
  border: 1px solid var(--hw-rule);
  border-radius: 4px;
  padding: 1.5rem 1.75rem 1.25rem;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.02),
    0 20px 40px -25px rgba(0, 0, 0, 0.15);
  max-width: 420px;
  font-size: 0.95rem;
  line-height: 1.6;
}

.note-preview-offset {
  margin-top: 2.5rem;
  transform: rotate(0.4deg);
  transition:
    box-shadow 0.15s ease,
    outline-color 0.15s ease;
  outline: 2px solid transparent;
  outline-offset: 3px;
}

.note-preview--flash {
  animation: note-flash 0.9s ease forwards;
}

.note-stack {
  position: relative;
  display: flex;
  align-items: flex-start;
}

.note-preview-zettel {
  position: absolute;
  inset: 0;
  margin-top: 2.5rem;
  transform: rotate(-0.6deg) translate(0, 0) scale(0.97);
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  transition:
    transform 0.4s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.3s ease;

  &.is-revealed {
    transform: rotate(-2deg) translate(28px, 28px) scale(0.97);
    opacity: 1;
    pointer-events: auto;
  }
}

@media (max-width: 640px) {
  .note-preview-zettel {
    &.is-revealed {
      transform: rotate(-1.5deg) translate(12px, 22px) scale(0.96);
    }
  }
}

@keyframes note-flash {
  0% {
    box-shadow:
      0 0 0 3px var(--hw-pink-wash-2),
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 20px 40px -25px rgba(0, 0, 0, 0.15);
  }
  25% {
    box-shadow:
      0 0 0 6px var(--hw-pink-wash-2),
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 20px 40px -25px rgba(0, 0, 0, 0.15);
  }
  100% {
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.02),
      0 20px 40px -25px rgba(0, 0, 0, 0.15);
  }
}

.note-header {
  margin-bottom: 0.5rem;
}

.note-breadcrumb {
  font-size: 0.72rem;
  color: var(--hw-ink-faint);
  letter-spacing: 0.02em;
}

.note-title {
  font-family: var(--hw-serif);
  font-size: 1.4rem;
  margin: 0.3rem 0 0.8rem;
  font-weight: 600;
  line-height: 1.2;
}

.note-body {
  color: var(--hw-ink-soft);

  p {
    margin: 0 0 0.75rem;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.note-link {
  color: var(--hw-pink-deep);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
}

.note-backlinks {
  margin-top: 1.2rem;
  padding-top: 0.9rem;
  border-top: 1px dashed var(--hw-rule);

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    padding: 0.15rem 0;
  }

  a {
    color: var(--hw-ink-soft);
    text-decoration: none;
    font-size: 0.9rem;
    font-style: italic;

    &:hover {
      color: var(--hw-pink-deep);
    }
  }
}

.backlinks-h {
  font-size: 0.7rem;
  color: var(--hw-ink-faint);
  letter-spacing: 0.1em;
  text-transform: lowercase;
  margin-bottom: 0.4rem;
}

/* ── Zettelkasten section ───────────────────────────────────── */
.zk {
  padding: 2rem 2rem 3rem;
  border-top: 1px solid var(--hw-rule);
}

.zk-inner {
  max-width: 760px;
  margin: 0 auto;
}

.zk-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.5rem;
    padding: 1rem 0;
    border-bottom: 1px dashed var(--hw-rule);

    &:last-child {
      border-bottom: 0;
    }
  }

  h4 {
    font-family: var(--hw-serif);
    font-size: 1.3rem;
    margin: 0 0 0.35rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--hw-ink-soft);
    font-size: 1rem;
    line-height: 1.55;
  }

  code {
    font-family: var(--hw-mono);
    background: var(--hw-pink-wash);
    color: var(--hw-pink-deep);
    padding: 0.05em 0.35em;
    border-radius: 3px;
    font-size: 0.9em;
  }
}

.zk-n {
  font-size: 0.95rem;
  color: var(--hw-pink-deep);
  letter-spacing: 0.1em;
  padding-top: 0.25rem;
}

img {
  box-shadow: none;
}

/* ── Logged-in hero ─────────────────────────────────────────── */
.li-hero {
  padding: 3rem 2rem 1.5rem;
}

.li-hero-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 2rem;
  flex-wrap: wrap;
}

.li-h1 {
  font-family: var(--hw-serif);
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 600;
  margin: 0.5rem 0 0.75rem;
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

.li-quick {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.li-quick-label {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--hw-ink-faint);
  text-transform: lowercase;
}

/* ── Logged-in main ─────────────────────────────────────────── */
.li-main {
  padding: 1rem 2rem 3rem;
}

.li-grid {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
}

.favs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  > :first-child.featured {
    grid-column: span 2;
    grid-row: span 2;
  }

  &.single-col {
    grid-template-columns: 1fr 1fr;
  }
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

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.15);
  }

  &.size-xl {
    min-height: 160px;

    .tile-name {
      font-size: 1.8rem;
    }
  }
}

.tile-top {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.tile-owner {
  font-size: 0.75rem;
  opacity: 0.65;
}

.tile-name {
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.1;
}

.add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px dashed var(--hw-rule);
  border-radius: 6px;
  color: var(--hw-ink-faint);
  text-decoration: none;
  min-height: 110px;
  font-size: 0.9rem;
  transition: all 0.15s;
  font-family: var(--hw-serif);

  &:hover {
    border-color: var(--hw-pink);
    color: var(--hw-pink-deep);
    background: var(--hw-pink-wash);
  }
}

.plus {
  font-size: 1.8rem;
  font-weight: 400;
  line-height: 1;
}

.empty-repos {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;

  p {
    color: var(--hw-ink-soft);
    margin: 0;
    font-size: 1rem;
  }
}

/* ── Sidebar lists ──────────────────────────────────────────── */
.recent-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    border-bottom: 1px dashed var(--hw-rule);

    &:last-child {
      border-bottom: 0;
    }
  }

  a {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.7rem 0;
    text-decoration: none;
    color: var(--hw-ink);

    &:hover .r-path {
      color: var(--hw-pink-deep);
    }
  }
}

.r-path {
  font-size: 0.82rem;
  color: var(--hw-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.due-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.9rem;
  align-items: center;
  padding: 1rem 1.1rem;
  background: var(--hw-pink-wash);
  border: 1px solid var(--hw-pink-wash-2);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.due-count {
  font-family: var(--hw-serif);
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--hw-pink-deep);
  line-height: 1;
}

.due-t {
  font-weight: 600;
  font-size: 0.95rem;
}

.due-d {
  font-size: 0.85rem;
  color: var(--hw-ink-soft);
}

.due-btn {
  font-size: 0.85rem;
  padding: 0.35rem 0.8rem;
}

.pub-notes-btn {
  width: 100%;
  justify-content: center;
  margin-top: 0.25rem;
}

/* ── Footer ─────────────────────────────────────────────────── */
.page-footer {
  border-top: 1px solid var(--hw-rule);
  padding: 3.5rem 2rem 2rem;
  margin-top: 5rem;
  background: linear-gradient(180deg, transparent, var(--hw-paper-warm));
  position: relative;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
}

.footer-brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.footer-mark {
  display: block;
  object-fit: contain;
}

.footer-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.footer-sub {
  font-size: 0.8rem;
  color: var(--hw-ink-faint);
  letter-spacing: 0.03em;
}

.footer-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.footer-h {
  font-family: var(--hw-mono);
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: var(--hw-ink-faint);
  margin-bottom: 0.75rem;
}

.footer-link {
  display: block;
  text-decoration: none;
  color: var(--hw-ink-soft);
  padding: 0.25rem 0;
  font-size: 0.95rem;

  &:hover {
    color: var(--hw-pink-deep);
  }
}

.footer-fine {
  max-width: 1100px;
  margin: 2.5rem auto 0;
  padding-top: 1.5rem;
  border-top: 1px dashed var(--hw-rule);
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  font-family: var(--hw-mono);
  font-size: 0.8rem;
  color: var(--hw-ink-faint);
}

.footer-dot {
  color: var(--hw-ink-faint);
}

/* ── Profile modal ──────────────────────────────────────────── */
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

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 900px) {
  .hero-ed-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .hero-ed-right {
    order: -1;
  }

  .flower-mark {
    width: 160px;
    height: 160px;
  }

  .hero-ed-paths {
    grid-template-columns: 1fr;
  }

  .feature-row {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .li-grid {
    grid-template-columns: 1fr;
  }

  .favs-grid {
    grid-template-columns: repeat(2, 1fr);

    > :first-child.featured {
      grid-column: span 2;
      grid-row: auto;
    }
  }

  .footer-inner {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .footer-cols {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .topnav {
    padding: 1rem 1.25rem;
  }

  .navlink {
    display: none;
  }

  .hero-ed {
    padding: 3rem 1.25rem 2rem;
  }

  .li-hero {
    padding: 2rem 1.25rem 1rem;
  }

  .li-hero-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .li-quick {
    align-items: flex-start;
    width: 100%;
  }

  .li-main,
  .manifesto,
  .demo,
  .zk,
  .page-footer {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}

@media (max-width: 520px) {
  .footer-cols {
    grid-template-columns: 1fr 1fr;
  }

  .favs-grid {
    grid-template-columns: 1fr;

    > :first-child.featured {
      grid-column: span 1;
    }
  }
}
</style>

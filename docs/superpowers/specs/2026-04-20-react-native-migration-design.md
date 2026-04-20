# Remanso React Native Migration — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Overview

Migrate Remanso from a Vue 3 web app to a fully native iOS + Android app built with Expo (React Native). The primary motivation is native feel: fluid stack animations, swipe-back gestures, and native navigation chrome. The scope is a full replacement of the web app.

## Tech Stack

| Concern | Current (Vue) | React Native |
|---|---|---|
| Framework | Vue 3 + Vite | Expo SDK (managed workflow) |
| Routing | Vue Router | Expo Router (file-system routing over React Navigation v7) |
| State | Pinia | Zustand |
| Server state | TanStack Vue Query | TanStack Query (same library) |
| Styling | DaisyUI + Tailwind CSS | NativeWind v4 |
| Local DB | PouchDB (IndexedDB) | Expo SQLite |
| Simple KV store | localStorage | MMKV |
| Auth | OAuth redirects | expo-auth-session |
| GitHub API | @octokit/rest | @octokit/rest (unchanged) |
| i18n | vue-i18n | react-i18next |
| Date utils | date-fns | date-fns (unchanged) |
| Markdown content | markdown-it (DOM) | react-native-webview |
| Fonts | CSS custom properties | expo-font |

## Navigation Structure

Expo Router generates a React Navigation v7 tree from the file system. The stacked note pattern — the core native feel win — maps to a nested Stack navigator where each backlink push adds a note with a native slide animation and swipe-left pops it.

```
Root Stack
├── Auth screens (unauthenticated, no tab bar)
│   ├── Home / Welcome
│   ├── GitHub OAuth callback
│   └── ATProto OAuth callback
│
└── Authenticated App — Bottom Tabs
    ├── Tab: Feed (Stack)
    │   ├── Repo picker
    │   └── Note Stack (nested Stack)
    │       ├── Note (root)
    │       ├── Note (pushed via backlink)  ← swipe-back to pop
    │       └── Note (pushed via backlink)  ← swipe-back to pop
    │
    ├── Tab: Inbox / Drafts / Todos (Stack)
    │   └── Note list → Note detail
    │
    ├── Tab: Public Notes (Stack)
    │   ├── Public note list
    │   └── Public note detail
    │
    └── Tab: Settings (Stack)
        ├── Settings root
        └── Font picker (presented as modal)
```

History and Spaced Repetition are accessible as sections within the Feed tab or as additional tabs — to be decided during implementation.

## Data Layer

PouchDB is replaced by **Expo SQLite** for structured data and **MMKV** for simple key-value preferences.

### Expo SQLite schema

```sql
CREATE TABLE IF NOT EXISTS github_tokens (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS atproto_sessions (
  id TEXT PRIMARY KEY,
  did TEXT NOT NULL
  -- full session_json stored in Expo SecureStore keyed by id
);

CREATE TABLE IF NOT EXISTS saved_repos (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL,
  repo TEXT NOT NULL,
  files_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL,
  repo TEXT NOT NULL,
  note_path TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

The existing `DataApi` interface (`add`, `update`, `remove`, `get`, `getAll`) is re-implemented as a thin wrapper over Expo SQLite. No ORM — plain async SQL with `CREATE TABLE IF NOT EXISTS` on first open handles schema initialization at this scale.

Sensitive data (access tokens, refresh tokens, ATProto sessions) is stored in **Expo SecureStore** rather than plain SQLite. SQLite holds only metadata and content cache.

### MMKV

Replaces localStorage for user settings: font family, font size, theme preference. Synchronous reads, no async overhead.

### No Web Worker

Database calls move to the main thread via Expo SQLite's async API. The performance concern that justified the Web Worker on web does not apply on mobile.

## Auth Flows

### GitHub OAuth

The existing auth server (`api.remanso.space/auth/github`) handles code exchange — the client flow is unchanged:

1. `expo-auth-session` opens an in-app browser tab with the GitHub authorize URL
2. OAuth redirect captured by Expo's deep link handler
3. Code sent to `api.remanso.space/auth/github?code=...` for token exchange
4. Access token + refresh token stored in Expo SecureStore
5. Token refresh logic (15-minute pre-expiry check) stays the same; HTTP calls use `fetch`

### ATProto / Bluesky OAuth

`@atproto/oauth-client-browser` is browser-only (IndexedDB, `window.crypto`, browser redirects). There is no official React Native client. A custom client (~200–300 lines) is implemented using:

- `expo-auth-session` for the OAuth redirect flow (PKCE)
- `expo-crypto` for PKCE code verifier/challenge generation
- Expo SecureStore for session persistence
- The same Bluesky API endpoints as the browser client

This keeps ATProto auth fully client-side, consistent with the app's current architecture.

## State Management

Zustand replaces Pinia. The store shape is identical to `userRepo.store.ts`:

```ts
const useRepoStore = create<RepoState>((set, get) => ({
  user: '',
  repo: '',
  files: [],
  userSettings: null,
  needToLogin: false,
  setRepo: (user, repo) => set({ user, repo }),
  loadFiles: async () => { /* Octokit call */ },
  loadSettings: async () => { /* MMKV read */ },
}))
```

TanStack Query handles all GitHub API server state (file fetching, README, repo listing) — same library, same patterns as today.

## Styling

NativeWind v4 provides Tailwind utility classes in React Native. DaisyUI is web-only and has no React Native equivalent — all component styling (buttons, cards, modals) is hand-written using NativeWind utilities.

The two DaisyUI themes (`retro` light, `coffee` dark) are translated into a custom NativeWind theme in `tailwind.config.ts` with the same color tokens. System appearance (`useColorScheme`) drives theme selection.

Font customization uses `expo-font` for loading custom fonts and React Native's `fontFamily` style prop, replacing the CSS custom property approach.

## Markdown Rendering

The markdown-it pipeline (KaTeX, Mermaid, shiki, tabler icons, html5-media, GitHub alerts, checkboxes) runs in the React Native JS context unchanged — same code, same output. The resulting HTML string is passed to a `NoteWebView` component built on `react-native-webview`.

`NoteWebView` is a native UIView/View wrapper around a WebView engine. It is a React Native component — not a web app. The surrounding app (navigation chrome, tab bar, headers, settings, auth screens) is 100% native. Only the note content pane renders HTML. This is the standard pattern for rich content in React Native (used by GitHub Mobile, Linear, and others).

The WebView communicates back to the native layer via `postMessage` for:
- Internal note link taps (trigger React Navigation push)
- External URL taps (open in system browser)
- Backlink detection events

## Project Structure

```
src/
├── app/                        # Expo Router — file-system screens
│   ├── _layout.tsx             # Root Stack navigator
│   ├── index.tsx               # Home / Welcome
│   └── (tabs)/                 # Authenticated tab navigator
│       ├── _layout.tsx
│       ├── feed/               # Feed + Note Stack screens
│       ├── inbox/
│       ├── public/
│       └── settings/
│
├── modules/                    # Feature domains (mirrors current structure)
│   ├── note/                   # Note models, hooks, caching
│   ├── repo/                   # Zustand store, Octokit service
│   ├── user/
│   │   ├── auth/               # GitHub + ATProto OAuth hooks
│   │   └── fonts.ts            # Font downloading (was utils/downloadFont.ts)
│   ├── card/                   # Spaced repetition
│   ├── history/                # Edit history
│   ├── atproto/                # Custom ATProto OAuth client, DID resolution
│   └── post/                   # ts-rest API client (unchanged)
│
├── components/                 # Shared UI components
│
├── rendering/                  # Markdown pipeline — first-class module
│   ├── pipeline.ts             # markdown-it setup + plugin registration
│   ├── plugins/                # Custom plugins
│   │   ├── html5-media.ts
│   │   ├── regexp.ts
│   │   └── tabler-icons.ts
│   └── NoteWebView.tsx         # react-native-webview wrapper
│
├── lib/                        # Shared low-level, stateless helpers
│   ├── text.ts                 # slugify, noteTitle, displayLanguage
│   ├── links.ts                # link.ts + youtube.ts
│   ├── encoding.ts             # decodeBase64ToUTF8
│   └── notifications.ts        # notif.ts
│
├── hooks/                      # React hooks
├── data/                       # Expo SQLite wrapper (same DataApi interface)
├── locales/                    # i18n strings (unchanged)
└── constants/                  # Theme tokens, note width constants
```

## Key Risks

1. **ATProto custom OAuth client** — no official SDK; requires careful PKCE implementation and session lifecycle management.
2. **DaisyUI → NativeWind component styling** — no 1:1 mapping; all themed components need to be rebuilt. Most labor-intensive non-feature work.
3. **NoteWebView ↔ native bridge** — link tap handling and scroll coordination between the WebView and the native Stack navigator require careful implementation to feel seamless.
4. **Mermaid in WebView** — Mermaid is JS-heavy; initial render may be slow on lower-end Android. May need lazy rendering or a timeout fallback.

## Out of Scope

- PWA / service worker (not applicable to native)
- Web Worker (replaced by async SQLite)
- Comlink (not applicable)
- Server-side rendering

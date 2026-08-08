# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remanso is a Vue 3 + TypeScript web app that displays markdown notes from GitHub repositories with Zettelkasten-style backlinks. Users access notes via `https://remanso.space/{user}/{repo}`. Also supports decentralized public notes via ATProto (Bluesky) at `/notes/:did/:rkey`. Supports both public repos (direct access) and private repos (GitHub OAuth).

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm test             # Vitest unit suite (jsdom, src/**/*.spec.ts)
pnpm test:browser     # Vitest browser mode (chromium, src/**/*.browser.spec.ts)
pnpm browser:install  # One-off: install the chromium the browser suite needs
pnpm lint             # ESLint with auto-fix
pnpm types            # TypeScript type-check
```

Run a single test file: `pnpm test src/modules/repo/services/resolvePath.spec.ts`

### Browser-mode tests

`*.browser.spec.ts` files run in a real headless chromium (Vitest browser mode +
Playwright, config in `vitest.browser.config.mts`), so they carry things jsdom
cannot: computed CSS from Tailwind/DaisyUI variables, mermaid's measured layout,
IndexedDB and Workers (PouchDB runs unmocked), real media elements, and
screenshot comparisons through `toMatchScreenshot`.

- `pnpm browser:install` once per machine. The dev container has no root and
  none of chromium's shared libraries, so the script vendors them (plus fonts)
  under `~/.local/share/chromium-deps`; elsewhere it just installs chromium.
  Re-run it after a container rebuild — `~/.local/share` is not persisted.
- Reference screenshots live in `__screenshots__/` next to the spec and are
  committed. They only hold on the machine that took them (font rendering), so
  CI skips the pixel comparisons and runs the behaviour; regenerate with
  `pnpm test:browser:update` and review the diff.
- Write a browser spec only for what needs a browser. Everything else stays in
  the jsdom suite, which is far faster.

## Architecture

### Tech Stack

- **Vue 3** (3.5) with Composition API, **Pinia** for state, **Vue Router**
- **Vite 7** build tool, **TypeScript** strict mode
- **Tailwind CSS v4** + **DaisyUI v5** for styling (PostCSS plugin approach, not tailwind.config.js)
- **arktype** for runtime type validation (used by the ATProto module)
- **PouchDB** (IndexedDB) for local persistence
- **Octokit** for GitHub API integration
- **markdown-it** with plugins (KaTeX, Shikiji, Mermaid, checkboxes, GitHub alerts)

### Styling

Tailwind v4 uses the modern CSS-based config in `src/styles/app.css`:

- `@import "tailwindcss"` instead of directives
- DaisyUI configured via `@plugin 'daisyui' { themes: retro --default, coffee --prefersdark; }`
- `@tailwindcss/typography` for prose styling

**Accent color**: never use the raw DaisyUI accent (`text-accent` / `var(--color-accent)`) for text or icons — on some themes it has too little contrast (e.g. cmyk's light yellow on white). Always use `--link-accent` (defined in `src/styles/app.css`): it re-pins the accent's lightness per light/dark scheme so contrast is always readable. Use `color: var(--link-accent)` in styles or the `text-(--link-accent)` utility in templates.

### Icons

Use [Tabler icons](https://tabler.io/icons) for every icon. Paste the outline SVG inline and keep `stroke="currentColor"` so it inherits color from its parent (accent-colored icons get `--link-accent` from their parent, see Styling above).

### Directory Structure

```sh
src/
├── views/           # Page components (FluxNoteView, FleetingNotes, etc.)
├── components/      # Reusable UI components
├── modules/         # Feature domains
│   ├── note/        # Note models, hooks, caching
│   ├── repo/        # GitHub repo integration (Pinia store, Octokit service)
│   ├── user/        # Authentication, user settings
│   ├── card/        # Spaced repetition
│   ├── history/     # Edit history tracking
│   └── atproto/     # ATProto/Bluesky integration (DID resolution, blob URLs)
├── hooks/           # Composition hooks (useMarkdown, useBacklinks, useGitHubContent, etc.)
├── data/            # PouchDB wrapper and data models
├── utils/           # Utilities including custom markdown-it plugins
├── locales/         # i18n (English/French)
└── bus/             # Event buses for inter-component communication
```

### Key Routes

- `/` - Home
- `/:user/:repo` - Main note view (FluxNoteView) with stacked notes
- `/:user/:repo/inbox|draft|todo|history` - Specialized note views
- `/notes` - Public note list (ATProto-based)
- `/notes/:did/:rkey` - Single public note view

### Key Files

- `src/router/router.ts` - Route definitions
- `src/modules/repo/store/userRepo.store.ts` - Central Pinia store for repo/file state
- `src/modules/repo/services/octo.ts` - Octokit wrapper for GitHub API
- `src/hooks/useMarkdown.hook.ts` - Markdown rendering with all plugins
- `src/data/data.ts` - PouchDB database wrapper

### Patterns

- All components use Composition API (`<script setup lang="ts">`)
- Custom hooks encapsulate feature logic (`use*.hook.ts` or `use*.ts`)
- Event buses (`noteEventBus`, `backlinkEventBus`) for cross-component communication
- Path alias: `@` maps to `src/`

# Instruments — inline interactive components in markdown

Date: 2026-07-26
Status: approved

## Goal

Let notes embed small interactive components ("instruments") with a one-line
markdown syntax. No persisted state. First two instruments: a countdown timer
that beeps when finished, and a stopwatch with laps and restart.

## Syntax

One line, own block:

```markdown
:::timer:::
:::timer 2m:::
:::stopwatch:::
```

- `^:::([a-z][\w-]*)(?:\s+(.*?))?:::\s*$` — name plus optional args, closing
  `:::` on the same line.
- Only registered instrument names match; anything else falls through to other
  rules (no clash with `::: tabs` containers, which never close on the same
  line).
- GitHub fallback: renders as literal `:::timer 2m:::` text — readable.

## Architecture

Mirrors the existing macroplan embed pattern (placeholder div from markdown-it,
Vue app mounted post-render).

- `src/utils/markdown/markdown-it-instruments.ts` — markdown-it block rule.
  Emits `<div class="instrument-block" data-instrument="timer" data-args="2m"></div>`.
  Registered on the singleton `md` in `useMarkdown.hook.ts`.
- `src/modules/instruments/registry.ts` — instrument names + lazy component
  loaders. Adding a future instrument = one registry entry + one component.
- `src/modules/instruments/runInstruments.ts` — finds unmounted
  `.instrument-block` elements in scope, lazy-loads the component,
  `createApp(component, { args }).mount(el)`. Keeps a list of mounted apps and
  unmounts any whose root element left the DOM (prevents leaked intervals and
  ghost beeps after a note re-render). Runs unconditionally from
  `useMarkdownPostRender` — covers repo note views and the ATProto public note
  view with no per-view wiring.
- `src/modules/instruments/duration.ts` — duration parsing and time formatting
  (pure, tested).
- `src/modules/instruments/components/TimerInstrument.vue`
- `src/modules/instruments/components/StopwatchInstrument.vue`

## Timer

- Args: `2m`, `90s`, `1h30m`, bare number = minutes. Invalid or missing args →
  minutes input shown in the UI.
- Controls: start / pause / reset. Countdown display mm:ss (h:mm:ss above one
  hour).
- Ticking is timestamp-based (end time minus now), not interval-accumulated —
  drift-safe and correct in background tabs.
- On zero: WebAudio oscillator beep (no audio asset) + visual done state. The
  AudioContext is created/resumed inside the start click handler (user
  gesture) so the beep is not blocked by autoplay policy.

## Stopwatch

- Display: mm:ss.t (tenths).
- Controls: start/pause toggle, lap (records split list: lap delta + total),
  restart (back to zero, keeps running, clears laps), stop (zero, halted,
  clears laps).
- Same timestamp-based ticking.

## Styling

DaisyUI buttons/inputs, Tabler outline icons inline with
`stroke="currentColor"`. English labels via `title`/`aria-label` attributes —
matches existing embedded components (macroplan has no i18n either); locale
files are near-empty so no i18n wiring for v1.

## Known limits (accepted for v1)

- Note re-render (background GitHub sync, checkbox toggle rewrite) replaces
  the DOM and resets a running instrument.
- Instruments mounted via `createApp` are separate app instances: no Pinia, no
  router, no i18n inside — fine for stateless instruments.

## Second wave (added 2026-07-26, grounded in the owner's notes vault)

New registered names (aliases share one component): `until`/`since`
(DateCountInstrument, day counter vs an ISO date + optional label),
`flashcards` (table-fed shuffled reveal deck) and `flashcard` (same component,
singular: first table row as a lone reveal/hide card, no deck mechanics),
`intervals` (sequenced
multi-step timer, `15m échauffement, 1m gainage` / `30s x6`),
`takt-time` (time to ship one unit, `22 / 480m` → 21:49 per unit) and `takt`
(same component, inverse view: units per hour → 2.75 units / hour) — demand
first, then time, the order the lean question is asked, `urn` (equivalent-bet
calibration, `1/20`), `bayes` (interactive Bayes explorable with sliders +
1000-dot population grid, `prior=1% sensitivity=90% fpr=5%`).

### Sibling-table contract extension

Instruments flagged in `instrumentWantsTable` (registry) receive the markdown
table rendered immediately after their placeholder: `runInstruments` reads the
next element sibling (tables are wrapped in `div.overflow-x-auto`), extracts
header + rows as trimmed text, hides the wrapper, and passes
`{ header, rows }` as the `table` prop. The table stays the single source of
data in the note and the readable GitHub fallback. Only flashcards uses it for
now; any instrument can opt in via the registry flag. All instrument
components receive `args`, `name`, and (when extracted) `table` props.

## Tests

- Block rule: matches bare and arg forms, ignores unknown names, no conflict
  with `::: tabs`, args HTML-escaped.
- `parseDuration` / `formatSeconds`: unit specs.
- Components (vue-test-utils + fake timers): timer counts down and fires done,
  pause freezes, reset restores; stopwatch lap/restart/stop semantics.

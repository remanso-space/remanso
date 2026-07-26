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

## Tests

- Block rule: matches bare and arg forms, ignores unknown names, no conflict
  with `::: tabs`, args HTML-escaped.
- `parseDuration` / `formatSeconds`: unit specs.
- Components (vue-test-utils + fake timers): timer counts down and fires done,
  pause freezes, reset restores; stopwatch lap/restart/stop semantics.

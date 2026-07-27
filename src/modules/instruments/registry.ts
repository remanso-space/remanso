import type { Component } from "vue"

const loaders = {
  timer: () =>
    import("./components/TimerInstrument.vue").then((m) => m.default),
  stopwatch: () =>
    import("./components/StopwatchInstrument.vue").then((m) => m.default),
  until: () =>
    import("./components/DateCountInstrument.vue").then((m) => m.default),
  since: () =>
    import("./components/DateCountInstrument.vue").then((m) => m.default),
  flashcards: () =>
    import("./components/FlashcardsInstrument.vue").then((m) => m.default),
  flashcard: () =>
    import("./components/FlashcardsInstrument.vue").then((m) => m.default),
  intervals: () =>
    import("./components/IntervalsInstrument.vue").then((m) => m.default),
  "takt-time": () =>
    import("./components/TaktTimeInstrument.vue").then((m) => m.default),
  takt: () =>
    import("./components/TaktTimeInstrument.vue").then((m) => m.default),
  urn: () => import("./components/UrnInstrument.vue").then((m) => m.default),
  bayes: () =>
    import("./components/BayesInstrument.vue").then((m) => m.default),
  kingman: () =>
    import("./components/KingmanInstrument.vue").then((m) => m.default),
  breath: () =>
    import("./components/BreathInstrument.vue").then((m) => m.default),
  "prime-hand": () =>
    import("./components/PrimeHandInstrument.vue").then((m) => m.default),
  "quota-ratchet": () =>
    import("./components/QuotaRatchetInstrument.vue").then((m) => m.default),
  reification: () =>
    import("./components/ReificationInstrument.vue").then((m) => m.default),
  "silent-gears": () =>
    import("./components/SilentGearsInstrument.vue").then((m) => m.default),
  "naming-filter": () =>
    import("./components/NamingFilterInstrument.vue").then((m) => m.default)
} satisfies Record<string, () => Promise<Component>>

export type InstrumentName = keyof typeof loaders

export const instrumentNames = Object.keys(loaders) as InstrumentName[]

export const instrumentLoaders: Record<
  InstrumentName,
  () => Promise<Component>
> = loaders

/**
 * Instruments that consume the markdown table right below them as data —
 * runInstruments extracts the sibling table, hides it, and passes it as the
 * `table` prop. Keeps long content (full-sentence flashcards) in a normal
 * table: single source, readable GitHub fallback.
 */
export const instrumentWantsTable: Partial<Record<InstrumentName, true>> = {
  flashcards: true,
  flashcard: true,
  "prime-hand": true,
  reification: true,
  "silent-gears": true,
  "naming-filter": true
}

/**
 * Instruments that read the markdown list right below them as data when no
 * inline args are given — runInstruments extracts the sibling `<ul>`/`<ol>`
 * items and passes them as the `list` prop. The list stays visible as the
 * single source and the plain GitHub fallback.
 */
export const instrumentWantsList: Partial<Record<InstrumentName, true>> = {
  intervals: true
}

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
  bayes: () => import("./components/BayesInstrument.vue").then((m) => m.default)
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
  flashcard: true
}

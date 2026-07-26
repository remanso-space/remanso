import type { Component } from "vue"

export const instrumentNames = ["timer", "stopwatch"] as const
export type InstrumentName = (typeof instrumentNames)[number]

export const instrumentLoaders: Record<
  InstrumentName,
  () => Promise<Component>
> = {
  timer: () =>
    import("./components/TimerInstrument.vue").then((m) => m.default),
  stopwatch: () =>
    import("./components/StopwatchInstrument.vue").then((m) => m.default)
}

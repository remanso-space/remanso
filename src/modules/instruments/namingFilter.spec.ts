import { describe, expect, it } from "vitest"

import {
  clampLens,
  DEFAULT_EVENTS,
  type HarmEvent,
  isCounted,
  LENSES,
  parseEvents,
  parseKind,
  tallyAt
} from "@/modules/instruments/namingFilter"

const events: HarmEvent[] = [
  { text: "Gas cut off", lives: 100, kind: "institutional" },
  { text: "Refinery blockaded", lives: 0, kind: "revolutionary" },
  { text: "Station burns", lives: 2, kind: "revolutionary" },
  { text: "Square cleared", lives: 40, kind: "repressive" }
]

describe("parseKind", () => {
  it("reads the three violences in english and french", () => {
    expect(parseKind("Institutional")).toBe("institutional")
    expect(parseKind(" institutionnelle ")).toBe("institutional")
    expect(parseKind("révolutionnaire")).toBe("revolutionary")
    expect(parseKind("répressive")).toBe("repressive")
  })

  it("rejects anything else", () => {
    expect(parseKind("criminal")).toBeNull()
  })
})

describe("parseEvents", () => {
  it("reads event, lives, and kind", () => {
    expect(
      parseEvents({
        header: ["Event", "Lives", "Kind"],
        rows: [["Gas cut off", "3,200", "institutional"]]
      })
    ).toEqual([{ text: "Gas cut off", lives: 3200, kind: "institutional" }])
  })

  it("drops rows with an unknown kind", () => {
    expect(
      parseEvents({
        header: [],
        rows: [
          ["Known", "1", "repressive"],
          ["Unknown", "1", "criminal"]
        ]
      })
    ).toEqual([{ text: "Known", lives: 1, kind: "repressive" }])
  })

  it("falls back to the default events without usable rows", () => {
    expect(parseEvents()).toBe(DEFAULT_EVENTS)
    expect(parseEvents({ header: [], rows: [["x", "1", "nope"]] })).toBe(
      DEFAULT_EVENTS
    )
  })
})

describe("clampLens", () => {
  it("keeps the index inside the lenses", () => {
    expect(clampLens(-3)).toBe(0)
    expect(clampLens(99)).toBe(LENSES.length - 1)
  })
})

describe("isCounted", () => {
  it("counts only the revolutionary violence at the narrowest lens", () => {
    expect(events.map((event) => isCounted(event, 0))).toEqual([
      false,
      true,
      true,
      false
    ])
  })

  it("adds the repressive violence at the middle lens", () => {
    expect(isCounted(events[3], 1)).toBe(true)
    expect(isCounted(events[0], 1)).toBe(false)
  })

  it("counts everything at the widest lens", () => {
    expect(events.every((event) => isCounted(event, 2))).toBe(true)
  })
})

describe("tallyAt", () => {
  it("counts two of four events and two of 142 lives at first", () => {
    expect(tallyAt(events, 0)).toEqual({
      events: 2,
      lives: 2,
      totalEvents: 4,
      totalLives: 142
    })
  })

  it("adds no lives to the total as the lens widens", () => {
    const narrow = tallyAt(events, 0)
    const wide = tallyAt(events, 2)
    expect(wide.totalLives).toBe(narrow.totalLives)
    expect(wide.lives).toBe(142)
    expect(wide.events).toBe(4)
  })
})

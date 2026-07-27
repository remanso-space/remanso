import { describe, expect, it } from "vitest"

import {
  DEFAULT_TOLLS,
  formatElapsed,
  namedTotal,
  parseGearsArgs,
  parseTolls,
  silentTotal,
  tollAt,
  unnamedPerNamed
} from "@/modules/instruments/silentGears"

const tolls = [
  { cause: "Hunger", perYear: 3650, named: false },
  { cause: "Work", perYear: 730, named: false },
  { cause: "Riots", perYear: 365, named: true }
]

describe("parseGearsArgs", () => {
  it("defaults to one day of world time per second", () => {
    expect(parseGearsArgs("")).toEqual({ daysPerSecond: 1 })
  })

  it("reads speed and its short form", () => {
    expect(parseGearsArgs("speed=30").daysPerSecond).toBe(30)
    expect(parseGearsArgs("s=0.5").daysPerSecond).toBe(0.5)
  })

  it("falls back on nonsense and clamps to a year per second", () => {
    expect(parseGearsArgs("speed=abc").daysPerSecond).toBe(1)
    expect(parseGearsArgs("speed=0").daysPerSecond).toBe(1)
    expect(parseGearsArgs("speed=99999").daysPerSecond).toBe(365)
  })
})

describe("parseTolls", () => {
  it("reads cause, yearly deaths, and whether it is called violence", () => {
    expect(
      parseTolls({
        header: ["Cause", "Deaths per year", "Called violence"],
        rows: [
          ["Hunger", "9,000,000", "no"],
          ["Riots", "8 300", "yes"]
        ]
      })
    ).toEqual([
      { cause: "Hunger", perYear: 9000000, named: false },
      { cause: "Riots", perYear: 8300, named: true }
    ])
  })

  it("accepts french and mark spellings of the named column", () => {
    const parsed = parseTolls({
      header: [],
      rows: [
        ["A", "10", "oui"],
        ["B", "10", "✓"],
        ["C", "10", ""]
      ]
    })
    expect(parsed.map((toll) => toll.named)).toEqual([true, true, false])
  })

  it("falls back to the default tolls without usable rows", () => {
    expect(parseTolls()).toBe(DEFAULT_TOLLS)
    expect(parseTolls({ header: [], rows: [["", "10", "no"]] })).toBe(
      DEFAULT_TOLLS
    )
  })
})

describe("tollAt", () => {
  it("prorates the yearly figure over elapsed days", () => {
    expect(tollAt(tolls[0], 365)).toBe(3650)
    expect(tollAt(tolls[0], 1)).toBe(10)
    expect(tollAt(tolls[0], 0)).toBe(0)
  })

  it("never runs backwards before the start", () => {
    expect(tollAt(tolls[0], -50)).toBe(0)
  })
})

describe("totals", () => {
  it("keeps the named toll out of the silent sum", () => {
    expect(silentTotal(tolls, 365)).toBe(4380)
    expect(namedTotal(tolls, 365)).toBe(365)
  })

  it("reports how many uncounted dead there are per named one", () => {
    expect(unnamedPerNamed(tolls, 365)).toBe(12)
  })

  it("holds the ratio steady between two ticks of the named counter", () => {
    // The named toll only reaches a whole death every 365/365 = 1 day here;
    // dividing the floored counters would double the ratio just before a tick.
    const rare = [
      { cause: "Hunger", perYear: 3650, named: false },
      { cause: "Riots", perYear: 300, named: true }
    ]
    expect(unnamedPerNamed(rare, 1.3)).toBe(12)
    expect(unnamedPerNamed(rare, 2.4)).toBe(12)
    expect(unnamedPerNamed(rare, 3650)).toBe(12)
  })

  it("reports no ratio while nothing named has happened", () => {
    expect(unnamedPerNamed(tolls, 0)).toBeNull()
    expect(unnamedPerNamed([{ cause: "A", perYear: 1, named: false }], 9)).toBe(
      null
    )
  })
})

describe("formatElapsed", () => {
  it("shows days, then months, then years", () => {
    expect(formatElapsed(0)).toBe("0 d")
    expect(formatElapsed(12.9)).toBe("12 d")
    expect(formatElapsed(32)).toBe("1 mo 2 d")
    expect(formatElapsed(60)).toBe("2 mo")
    expect(formatElapsed(365)).toBe("1 y")
    expect(formatElapsed(400)).toBe("1 y 1 mo 5 d")
  })
})

import { describe, expect, it } from "vitest"

import {
  countAt,
  DEFAULT_GRAINS,
  DEFAULT_YEARS,
  formatCount,
  parseDuration,
  parseGrains,
  parseSablierArgs
} from "@/modules/instruments/sablier"

describe("parseDuration", () => {
  it("reads French and English units into days", () => {
    expect(parseDuration("40 ans")).toBeCloseTo(40 * 365)
    expect(parseDuration("3 mois")).toBe(90)
    expect(parseDuration("1 semaine")).toBe(7)
    expect(parseDuration("1 jour")).toBe(1)
    expect(parseDuration("1 heure")).toBeCloseTo(1 / 24)
    expect(parseDuration("15 minutes")).toBeCloseTo(15 / 1440)
    expect(parseDuration("2 years")).toBe(730)
  })

  it("reads a bare number as days", () => {
    expect(parseDuration("30")).toBe(30)
  })

  it("tolerates a French decimal comma", () => {
    expect(parseDuration("1,5 jour")).toBe(1.5)
  })

  it("returns NaN on nonsense", () => {
    expect(parseDuration("plus tard")).toBeNaN()
  })
})

describe("parseSablierArgs", () => {
  it("defaults to the years horizon", () => {
    expect(parseSablierArgs("").daysLeft).toBe(DEFAULT_YEARS * 365)
  })

  it("reads years", () => {
    expect(parseSablierArgs("years=60").daysLeft).toBe(60 * 365)
  })

  it("reads days, taking precedence over years", () => {
    expect(parseSablierArgs("days=100 years=60").daysLeft).toBe(100)
  })

  it("clamps to a sane range", () => {
    expect(parseSablierArgs("days=0").daysLeft).toBe(1)
    expect(parseSablierArgs("days=99999999").daysLeft).toBe(1_000_000)
  })
})

describe("parseGrains", () => {
  it("reads grains and sorts them coarse to fine", () => {
    const grains = parseGrains({
      header: ["Grain", "Durée"],
      rows: [
        ["Un jour", "1 jour"],
        ["Le temps qui reste", "40 ans"],
        ["Une émotion", "15 minutes"]
      ]
    })
    expect(grains.map((grain) => grain.label)).toEqual([
      "Le temps qui reste",
      "Un jour",
      "Une émotion"
    ])
  })

  it("drops rows with an unreadable duration", () => {
    const grains = parseGrains({
      header: [],
      rows: [
        ["Un jour", "1 jour"],
        ["Bientôt", "plus tard"]
      ]
    })
    expect(grains).toHaveLength(1)
  })

  it("falls back to the default scale without a usable table", () => {
    expect(parseGrains()).toBe(DEFAULT_GRAINS)
    expect(parseGrains({ header: [], rows: [["", "1 jour"]] })).toBe(
      DEFAULT_GRAINS
    )
  })
})

describe("countAt", () => {
  it("gives one when the grain is the whole stock", () => {
    expect(countAt(14600, { label: "vie", days: 14600 })).toBe(1)
  })

  it("explodes as the grain shrinks", () => {
    expect(countAt(14600, { label: "jour", days: 1 })).toBe(14600)
    expect(countAt(14600, { label: "min", days: 1 / 1440 })).toBe(14600 * 1440)
  })

  it("floors to whole grains and never goes negative", () => {
    expect(countAt(10, { label: "x", days: 3 })).toBe(3)
    expect(countAt(-5, { label: "x", days: 1 })).toBe(0)
  })

  it("gives zero when the grain is bigger than the stock", () => {
    expect(countAt(10, { label: "x", days: 40 })).toBe(0)
  })
})

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(1401600)).toBe("1,401,600")
  })
})

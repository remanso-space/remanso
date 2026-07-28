import { describe, expect, it } from "vitest"

import {
  type Case,
  countSorted,
  DEFAULT_CASES,
  parseCases
} from "@/modules/instruments/colorblindResort"

describe("parseCases", () => {
  it("reads person, colour, and destination", () => {
    expect(
      parseCases({
        header: ["Personne", "Couleur", "Où"],
        rows: [["A family", "Black", "The ghetto"]]
      })
    ).toEqual([
      { person: "A family", color: "Black", destination: "The ghetto" }
    ])
  })

  it("drops rows missing a person or a destination", () => {
    expect(
      parseCases({
        header: [],
        rows: [
          ["A family", "Black", "The ghetto"],
          ["", "White", "The neighbourhood"],
          ["A worker", "Black", ""]
        ]
      })
    ).toEqual([
      { person: "A family", color: "Black", destination: "The ghetto" }
    ])
  })

  it("falls back to the default cases without usable rows", () => {
    expect(parseCases()).toBe(DEFAULT_CASES)
    expect(parseCases({ header: [], rows: [] })).toBe(DEFAULT_CASES)
  })
})

describe("countSorted", () => {
  const cases: Case[] = [
    { person: "A family", color: "White", destination: "Neighbourhood" },
    { person: "A family", color: "Black", destination: "Ghetto" },
    { person: "A worker", color: "White", destination: "Inside" },
    { person: "A worker", color: "Black", destination: "Outside" }
  ]

  it("counts persons whose destination depends on colour", () => {
    expect(countSorted(cases)).toEqual({ split: 2, total: 2 })
  })

  it("does not count a person sorted the same way in every colour", () => {
    const unsorted: Case[] = [
      { person: "A voter", color: "White", destination: "The booth" },
      { person: "A voter", color: "Black", destination: "The booth" }
    ]
    expect(countSorted(unsorted)).toEqual({ split: 0, total: 1 })
  })
})

import { describe, expect, it } from "vitest"

import {
  coincidenceProbability,
  DEFAULT_INSTITUTIONS,
  formatPercent,
  type Institution,
  parseDoubt,
  parseInstitutions
} from "@/modules/instruments/coincidenceStack"

describe("parseDoubt", () => {
  it("reads a percentage and a fraction alike", () => {
    expect(parseDoubt("50 %")).toBe(0.5)
    expect(parseDoubt("0.5")).toBe(0.5)
    expect(parseDoubt("40")).toBeCloseTo(0.4)
  })

  it("falls back to a coin-flip on garbage or zero", () => {
    expect(parseDoubt("")).toBe(0.5)
    expect(parseDoubt("oui")).toBe(0.5)
    expect(parseDoubt("0")).toBe(0.5)
  })

  it("clamps to a valid probability", () => {
    expect(parseDoubt("999 %")).toBe(1)
  })
})

describe("parseInstitutions", () => {
  it("reads name, outcome, and doubt", () => {
    expect(
      parseInstitutions({
        header: ["Institution", "Ce qu'on sait", "Bénéfice du doute"],
        rows: [["The church", "Segregated Sunday", "50 %"]]
      })
    ).toEqual([
      { name: "The church", outcome: "Segregated Sunday", doubt: 0.5 }
    ])
  })

  it("drops rows without a name", () => {
    expect(
      parseInstitutions({
        header: [],
        rows: [
          ["Named", "outcome", "50 %"],
          ["", "orphan", "50 %"]
        ]
      })
    ).toEqual([{ name: "Named", outcome: "outcome", doubt: 0.5 }])
  })

  it("falls back to the default institutions without usable rows", () => {
    expect(parseInstitutions()).toBe(DEFAULT_INSTITUTIONS)
    expect(parseInstitutions({ header: [], rows: [] })).toBe(
      DEFAULT_INSTITUTIONS
    )
  })
})

describe("coincidenceProbability", () => {
  const halves: Institution[] = [
    { name: "a", outcome: "", doubt: 0.5 },
    { name: "b", outcome: "", doubt: 0.5 },
    { name: "c", outcome: "", doubt: 0.5 }
  ]

  it("is 1 for the empty set — nothing ruled out", () => {
    expect(coincidenceProbability([])).toBe(1)
  })

  it("halves with each institution counted", () => {
    expect(coincidenceProbability(halves.slice(0, 1))).toBe(0.5)
    expect(coincidenceProbability(halves.slice(0, 2))).toBe(0.25)
    expect(coincidenceProbability(halves)).toBe(0.125)
  })
})

describe("formatPercent", () => {
  it("drops decimals at or above ten percent", () => {
    expect(formatPercent(0.5)).toBe("50%")
    expect(formatPercent(0.25)).toBe("25%")
    expect(formatPercent(0.125)).toBe("13%")
  })

  it("keeps one decimal below ten percent", () => {
    expect(formatPercent(0.0625)).toBe("6.3%")
    expect(formatPercent(0.03125)).toBe("3.1%")
  })
})

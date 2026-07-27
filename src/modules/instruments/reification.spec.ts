import { describe, expect, it } from "vitest"

import {
  DEFAULT_STAGES,
  formatMiles,
  MAX_MILES,
  parseStages,
  sliderToMiles,
  stageIndexAt
} from "@/modules/instruments/reification"

describe("parseStages", () => {
  it("reads miles and text from the table", () => {
    expect(
      parseStages({
        header: ["Miles", "What reaches the owner"],
        rows: [
          ["0", "A person"],
          ["500", "A row in the return"]
        ]
      })
    ).toEqual([
      { miles: 0, text: "A person" },
      { miles: 500, text: "A row in the return" }
    ])
  })

  it("sorts unsorted rows by distance", () => {
    const stages = parseStages({
      header: [],
      rows: [
        ["900", "far"],
        ["10", "near"]
      ]
    })
    expect(stages.map((stage) => stage.text)).toEqual(["near", "far"])
  })

  it("strips units from the miles column", () => {
    expect(parseStages({ header: [], rows: [["1,200 mi", "far"]] })[0]).toEqual({
      miles: 1200,
      text: "far"
    })
  })

  it("falls back to the default sequence without a usable table", () => {
    expect(parseStages()).toBe(DEFAULT_STAGES)
    expect(parseStages({ header: [], rows: [["0", ""]] })).toBe(DEFAULT_STAGES)
  })
})

describe("stageIndexAt", () => {
  const stages = [
    { miles: 0, text: "a" },
    { miles: 40, text: "b" },
    { miles: 600, text: "c" }
  ]

  it("picks the last stage already passed", () => {
    expect(stageIndexAt(stages, 0)).toBe(0)
    expect(stageIndexAt(stages, 39)).toBe(0)
    expect(stageIndexAt(stages, 40)).toBe(1)
    expect(stageIndexAt(stages, 5000)).toBe(2)
  })

  it("stays on the first stage below the first threshold", () => {
    expect(stageIndexAt([{ miles: 10, text: "a" }], 0)).toBe(0)
  })
})

describe("sliderToMiles", () => {
  it("runs from the row to London", () => {
    expect(sliderToMiles(0)).toBe(0)
    expect(sliderToMiles(100)).toBe(MAX_MILES)
  })

  it("spends real travel on the first few miles", () => {
    expect(sliderToMiles(25)).toBeLessThan(10)
    expect(sliderToMiles(50)).toBeLessThan(100)
  })

  it("never goes backwards", () => {
    const miles = Array.from({ length: 101 }, (_, i) => sliderToMiles(i))
    for (let i = 1; i < miles.length; i++) {
      expect(miles[i]).toBeGreaterThanOrEqual(miles[i - 1])
    }
  })

  it("clamps out-of-range positions", () => {
    expect(sliderToMiles(-10)).toBe(0)
    expect(sliderToMiles(400)).toBe(MAX_MILES)
  })
})

describe("formatMiles", () => {
  it("groups thousands", () => {
    expect(formatMiles(0)).toBe("0 mi")
    expect(formatMiles(3800)).toBe("3,800 mi")
  })
})

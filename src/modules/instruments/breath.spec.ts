import { describe, expect, it } from "vitest"

import {
  breathPhaseLabel,
  breathScale,
  parseBreath
} from "@/modules/instruments/breath"

describe("parseBreath", () => {
  it("defaults to box breathing over six cycles", () => {
    expect(parseBreath("")).toEqual({
      phases: [
        { kind: "inhale", seconds: 4 },
        { kind: "hold-in", seconds: 4 },
        { kind: "exhale", seconds: 4 },
        { kind: "hold-out", seconds: 4 }
      ],
      cycles: 6
    })
  })

  it("parses a three-part pattern as inhale, hold, exhale", () => {
    expect(parseBreath("4-7-8")).toEqual({
      phases: [
        { kind: "inhale", seconds: 4 },
        { kind: "hold-in", seconds: 7 },
        { kind: "exhale", seconds: 8 }
      ],
      cycles: 6
    })
  })

  it("parses a two-part pattern as coherent breathing", () => {
    expect(parseBreath("5-5")).toEqual({
      phases: [
        { kind: "inhale", seconds: 5 },
        { kind: "exhale", seconds: 5 }
      ],
      cycles: 6
    })
  })

  it("reads a trailing xN as the cycle count", () => {
    expect(parseBreath("4-7-8 x4")?.cycles).toBe(4)
    expect(parseBreath("4-7-8 x 12")?.cycles).toBe(12)
  })

  it("keeps the default pattern when only a cycle count is given", () => {
    expect(parseBreath("x3")).toEqual({
      phases: [
        { kind: "inhale", seconds: 4 },
        { kind: "hold-in", seconds: 4 },
        { kind: "exhale", seconds: 4 },
        { kind: "hold-out", seconds: 4 }
      ],
      cycles: 3
    })
  })

  it("drops zero-second phases while keeping positional kinds", () => {
    expect(parseBreath("4-0-8-0")?.phases).toEqual([
      { kind: "inhale", seconds: 4 },
      { kind: "exhale", seconds: 8 }
    ])
  })

  it("returns null when the inhale or the exhale is missing", () => {
    expect(parseBreath("0-4-8")).toBeNull()
    expect(parseBreath("4-7-0")).toBeNull()
  })

  it("returns null for unparsable patterns", () => {
    expect(parseBreath("garbage")).toBeNull()
    expect(parseBreath("4")).toBeNull()
    expect(parseBreath("4-4-4-4-4")).toBeNull()
    expect(parseBreath("4-7-8 x0")).toBeNull()
    expect(parseBreath("4-7-8 x100")).toBeNull()
  })

  it("returns null for phases longer than a minute", () => {
    expect(parseBreath("4-7-61")).toBeNull()
  })
})

describe("breathPhaseLabel", () => {
  it("labels both holds the same", () => {
    expect(breathPhaseLabel("inhale")).toBe("Inhale")
    expect(breathPhaseLabel("exhale")).toBe("Exhale")
    expect(breathPhaseLabel("hold-in")).toBe("Hold")
    expect(breathPhaseLabel("hold-out")).toBe("Hold")
  })
})

describe("breathScale", () => {
  it("fills on the inhale and empties on the exhale", () => {
    expect(breathScale("inhale", 0)).toBeCloseTo(0.45)
    expect(breathScale("inhale", 1)).toBeCloseTo(1)
    expect(breathScale("exhale", 0)).toBeCloseTo(1)
    expect(breathScale("exhale", 1)).toBeCloseTo(0.45)
  })

  it("holds still through both holds", () => {
    expect(breathScale("hold-in", 0.5)).toBeCloseTo(1)
    expect(breathScale("hold-out", 0.5)).toBeCloseTo(0.45)
  })

  it("clamps progress outside 0..1", () => {
    expect(breathScale("inhale", -1)).toBeCloseTo(0.45)
    expect(breathScale("inhale", 2)).toBeCloseTo(1)
  })
})

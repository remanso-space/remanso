import { describe, expect, it } from "vitest"

import {
  formatFraction,
  formatHands,
  parsePeople,
  snapFraction,
  totalHands
} from "@/modules/instruments/primeHand"

describe("parsePeople", () => {
  it("reads name, detail and output from the table", () => {
    expect(
      parsePeople({
        header: ["Person", "Between the lines", "Picked"],
        rows: [["Mary", "14. Sized rather than aged.", "148 lb"]]
      })
    ).toEqual([
      { name: "Mary", detail: "14. Sized rather than aged.", output: "148 lb" }
    ])
  })

  it("tolerates a missing output column", () => {
    expect(
      parsePeople({ header: [], rows: [["Isaac", "Field hand, 40"]] })
    ).toEqual([{ name: "Isaac", detail: "Field hand, 40", output: "" }])
  })

  it("drops rows without a name", () => {
    expect(parsePeople({ header: [], rows: [["", "orphan detail"]] })).toEqual(
      []
    )
  })

  it("returns nothing without a table", () => {
    expect(parsePeople()).toEqual([])
  })
})

describe("snapFraction", () => {
  it("keeps the four allowed values", () => {
    expect(snapFraction(0.25)).toBe(0.25)
    expect(snapFraction(1)).toBe(1)
  })

  it("snaps anything in between to the nearest quarter hand", () => {
    expect(snapFraction(0.3)).toBe(0.25)
    expect(snapFraction(0.6)).toBe(0.5)
    expect(snapFraction(0.9)).toBe(1)
  })

  it("clamps outside the range", () => {
    expect(snapFraction(0)).toBe(0.25)
    expect(snapFraction(5)).toBe(1)
  })
})

describe("formatFraction", () => {
  it("writes fractions the way the planters did", () => {
    expect(formatFraction(0.25)).toBe("¼")
    expect(formatFraction(0.5)).toBe("½")
    expect(formatFraction(0.75)).toBe("¾")
    expect(formatFraction(1)).toBe("1")
  })
})

describe("totalHands", () => {
  it("adds people up into hands", () => {
    expect(totalHands([0.25, 0.5, 0.75, 1])).toBe(2.5)
  })

  it("is zero for nobody", () => {
    expect(totalHands([])).toBe(0)
  })
})

describe("formatHands", () => {
  it("trims trailing zeros", () => {
    expect(formatHands(3)).toBe("3")
    expect(formatHands(3.5)).toBe("3.5")
    expect(formatHands(3.25)).toBe("3.25")
  })

  it("rounds floating point noise away", () => {
    expect(formatHands(0.1 + 0.2)).toBe("0.3")
  })
})

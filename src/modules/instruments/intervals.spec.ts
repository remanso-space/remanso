import { describe, expect, it } from "vitest"

import { parseIntervals } from "@/modules/instruments/intervals"

describe("parseIntervals", () => {
  it("parses comma-separated steps with labels and accents", () => {
    expect(parseIntervals("15m échauffement, 1m gainage, 2m récup")).toEqual([
      { seconds: 900, label: "échauffement" },
      { seconds: 60, label: "gainage" },
      { seconds: 120, label: "récup" }
    ])
  })

  it("expands xN repeats with numbered labels", () => {
    expect(parseIntervals("30s x6")).toEqual([
      { seconds: 30, label: "1/6" },
      { seconds: 30, label: "2/6" },
      { seconds: 30, label: "3/6" },
      { seconds: 30, label: "4/6" },
      { seconds: 30, label: "5/6" },
      { seconds: 30, label: "6/6" }
    ])
  })

  it("numbers repeated step labels", () => {
    expect(parseIntervals("30s pompes x 3")).toEqual([
      { seconds: 30, label: "pompes 1/3" },
      { seconds: 30, label: "pompes 2/3" },
      { seconds: 30, label: "pompes 3/3" }
    ])
  })

  it("treats a bare number as minutes", () => {
    expect(parseIntervals("5")).toEqual([{ seconds: 300, label: "" }])
  })

  it("parses compound durations with multi-word labels", () => {
    expect(parseIntervals("1h30m long run")).toEqual([
      { seconds: 5400, label: "long run" }
    ])
  })

  it("keeps a label ending in xN-like text when not a separate word", () => {
    expect(parseIntervals("30s box2, 1m rest")).toEqual([
      { seconds: 30, label: "box2" },
      { seconds: 60, label: "rest" }
    ])
  })

  it("returns null when any single step is unparsable", () => {
    expect(parseIntervals("15m warmup, nope, 1m plank")).toBeNull()
  })

  it("returns null for empty args", () => {
    expect(parseIntervals("")).toBeNull()
    expect(parseIntervals("   ")).toBeNull()
  })

  it("returns null for zero durations", () => {
    expect(parseIntervals("0m rest")).toBeNull()
  })

  it("returns null for repeats below 2", () => {
    expect(parseIntervals("30s x1")).toBeNull()
    expect(parseIntervals("30s x0")).toBeNull()
  })
})

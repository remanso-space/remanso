import { describe, expect, it } from "vitest"

import { formatDuration } from "@/utils/formatDuration"

describe("formatDuration", () => {
  it.each([
    [4, "0:04"],
    [65, "1:05"],
    [599, "9:59"],
    [3600, "1:00:00"],
    [3725, "1:02:05"],
    [36_000, "10:00:00"]
  ])("formats %i seconds as %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })

  it.each([[undefined], [null], [0], [-1], [Infinity], [NaN]])(
    "returns null for %o",
    (input) => {
      expect(formatDuration(input)).toBeNull()
    }
  )

  it("floors a fractional length", () => {
    expect(formatDuration(4.7)).toBe("0:04")
  })
})

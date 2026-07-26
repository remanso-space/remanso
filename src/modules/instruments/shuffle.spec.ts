import { describe, expect, it } from "vitest"

import { shuffle } from "@/modules/instruments/shuffle"

describe("shuffle", () => {
  it("returns a new array with the same items, leaving the input intact", () => {
    const items = ["a", "b", "c", "d"]
    const result = shuffle(items, () => 0.5)
    expect(result).not.toBe(items)
    expect([...result].sort()).toEqual(["a", "b", "c", "d"])
    expect(items).toEqual(["a", "b", "c", "d"])
  })

  it("is deterministic with a fixed random source", () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1])
    expect(shuffle([1, 2, 3, 4], () => 0.999)).toEqual([1, 2, 3, 4])
  })

  it("handles empty and single-item arrays", () => {
    expect(shuffle([], () => 0)).toEqual([])
    expect(shuffle([42], () => 0)).toEqual([42])
  })
})

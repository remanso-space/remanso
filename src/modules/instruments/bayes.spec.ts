import { describe, expect, it } from "vitest"

import {
  parseBayesArgs,
  population,
  posterior
} from "@/modules/instruments/bayes"

describe("parseBayesArgs", () => {
  it("parses full percent args", () => {
    expect(parseBayesArgs("prior=1% sensitivity=90% fpr=5%")).toEqual({
      prior: 0.01,
      sensitivity: 0.9,
      fpr: 0.05
    })
  })

  it("parses fraction values", () => {
    expect(parseBayesArgs("prior=0.01 sensitivity=0.9 fpr=0.05")).toEqual({
      prior: 0.01,
      sensitivity: 0.9,
      fpr: 0.05
    })
  })

  it("treats bare numbers as percentages", () => {
    expect(parseBayesArgs("prior=1 sensitivity=90 fpr=5")).toEqual({
      prior: 0.01,
      sensitivity: 0.9,
      fpr: 0.05
    })
  })

  it("falls back to defaults for missing keys", () => {
    expect(parseBayesArgs("prior=2%")).toEqual({
      prior: 0.02,
      sensitivity: 0.9,
      fpr: 0.05
    })
    expect(parseBayesArgs("")).toEqual({
      prior: 0.01,
      sensitivity: 0.9,
      fpr: 0.05
    })
  })

  it("falls back to the default for garbage values", () => {
    expect(parseBayesArgs("prior=abc sensitivity=90% fpr=oops")).toEqual({
      prior: 0.01,
      sensitivity: 0.9,
      fpr: 0.05
    })
  })

  it("clamps out-of-range values", () => {
    const parsed = parseBayesArgs("prior=500% sensitivity=0.00001% fpr=250%")
    expect(parsed.prior).toBe(1)
    expect(parsed.sensitivity).toBe(0.0001)
    expect(parsed.fpr).toBe(1)
  })
})

describe("posterior", () => {
  it("computes the medical test paradox example", () => {
    const value = posterior({ prior: 0.01, sensitivity: 0.9, fpr: 0.05 })
    expect(value).toBeCloseTo(0.1538, 3)
  })

  it("returns 0 when the numerator is 0", () => {
    expect(posterior({ prior: 0, sensitivity: 0.9, fpr: 0 })).toBe(0)
    expect(posterior({ prior: 0, sensitivity: 0.9, fpr: 0.05 })).toBe(0)
  })

  it("returns 1 when everyone who tests positive is sick", () => {
    expect(posterior({ prior: 1, sensitivity: 0.9, fpr: 0 })).toBe(1)
  })
})

describe("population", () => {
  it("computes the known counts for 1% / 90% / 5%", () => {
    const counts = population({ prior: 0.01, sensitivity: 0.9, fpr: 0.05 })
    expect(counts.tp + counts.fn).toBe(10)
    expect(counts.tp).toBe(9)
    expect(counts.fn).toBe(1)
    expect(counts.fp).toBe(50)
    expect(counts.tn).toBe(940)
  })

  it("always sums to the total", () => {
    const cases = [
      { prior: 0.01, sensitivity: 0.9, fpr: 0.05 },
      { prior: 0.333, sensitivity: 0.777, fpr: 0.123 },
      { prior: 1, sensitivity: 0.5, fpr: 0.5 },
      { prior: 0.0001, sensitivity: 0.0001, fpr: 0 }
    ]
    for (const params of cases) {
      const { tp, fn, fp, tn } = population(params)
      expect(tp + fn + fp + tn).toBe(1000)
    }
  })

  it("respects a custom total", () => {
    const { tp, fn, fp, tn } = population(
      { prior: 0.1, sensitivity: 0.8, fpr: 0.1 },
      100
    )
    expect(tp + fn + fp + tn).toBe(100)
    expect(tp).toBe(8)
    expect(fp).toBe(9)
  })
})

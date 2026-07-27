import { describe, expect, it } from "vitest"

import {
  cycleTime,
  parseKingmanArgs,
  utilizationFactor,
  variabilityFactor,
  waitTime,
  wip
} from "@/modules/instruments/kingman"

describe("parseKingmanArgs", () => {
  it("parses full args", () => {
    expect(parseKingmanArgs("u=90% ca=1.5 cs=0.5 t=12")).toEqual({
      utilization: 0.9,
      ca: 1.5,
      cs: 0.5,
      serviceTime: 12
    })
  })

  it("treats a bare utilization ≥ 1 as a percentage", () => {
    expect(parseKingmanArgs("u=85").utilization).toBe(0.85)
    expect(parseKingmanArgs("u=0.85").utilization).toBe(0.85)
  })

  it("accepts 100% and clamps it below 1", () => {
    expect(parseKingmanArgs("u=100%").utilization).toBe(0.999)
  })

  it("falls back to the M/M/1 defaults for missing keys", () => {
    expect(parseKingmanArgs("")).toEqual({
      utilization: 0.85,
      ca: 1,
      cs: 1,
      serviceTime: 10
    })
  })

  it("falls back for garbage values", () => {
    expect(parseKingmanArgs("u=abc ca=nope cs=-3 t=oops")).toEqual({
      utilization: 0.85,
      ca: 1,
      cs: 1,
      serviceTime: 10
    })
  })
})

describe("factors", () => {
  it("computes the variability factor", () => {
    expect(variabilityFactor(parseKingmanArgs("ca=1 cs=1"))).toBe(1)
    expect(variabilityFactor(parseKingmanArgs("ca=2 cs=0"))).toBe(2)
  })

  it("explodes the utilization factor near ρ = 1", () => {
    expect(utilizationFactor(parseKingmanArgs("u=50%"))).toBe(1)
    expect(utilizationFactor(parseKingmanArgs("u=90%"))).toBeCloseTo(9, 5)
    expect(utilizationFactor(parseKingmanArgs("u=99%"))).toBeCloseTo(99, 5)
  })
})

describe("waitTime", () => {
  it("matches the M/M/1 wait ρ·τ/(1−ρ) when Ca = Cs = 1", () => {
    const params = parseKingmanArgs("u=80% ca=1 cs=1 t=10")
    expect(waitTime(params)).toBeCloseTo(40, 5)
  })

  it("is zero with no variability", () => {
    expect(waitTime(parseKingmanArgs("u=90% ca=0 cs=0 t=10"))).toBe(0)
  })
})

describe("cycleTime and wip", () => {
  it("adds the service time to the wait", () => {
    const params = parseKingmanArgs("u=80% ca=1 cs=1 t=10")
    expect(cycleTime(params)).toBeCloseTo(50, 5)
  })

  it("collapses to the exact M/M/1 WIP ρ/(1−ρ)", () => {
    expect(wip(parseKingmanArgs("u=80% ca=1 cs=1 t=10"))).toBeCloseTo(4, 5)
    expect(wip(parseKingmanArgs("u=90% ca=1 cs=1 t=7"))).toBeCloseTo(9, 5)
  })

  it("obeys Little's Law: WIP = throughput × cycle time", () => {
    const params = parseKingmanArgs("u=75% ca=1.3 cs=0.7 t=8")
    const throughput = params.utilization / params.serviceTime
    expect(wip(params)).toBeCloseTo(throughput * cycleTime(params), 9)
  })
})

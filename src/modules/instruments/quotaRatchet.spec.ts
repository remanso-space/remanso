import { describe, expect, it } from "vitest"

import {
  applyDay,
  initialRatchetState,
  isFinished,
  parseRatchetArgs,
  type RatchetState
} from "@/modules/instruments/quotaRatchet"

const start = (target = 150, days = 7): RatchetState =>
  initialRatchetState({ target, days })

const play = (state: RatchetState, picks: number[]): RatchetState =>
  picks.reduce(applyDay, state)

describe("parseRatchetArgs", () => {
  it("parses target and days", () => {
    expect(parseRatchetArgs("target=200 days=10")).toEqual({
      target: 200,
      days: 10
    })
  })

  it("accepts the short keys", () => {
    expect(parseRatchetArgs("t=90 d=3")).toEqual({ target: 90, days: 3 })
  })

  it("falls back on missing or invalid values", () => {
    expect(parseRatchetArgs("")).toEqual({ target: 150, days: 7 })
    expect(parseRatchetArgs("target=-5 days=zero")).toEqual({
      target: 150,
      days: 7
    })
  })

  it("clamps the day count", () => {
    expect(parseRatchetArgs("days=500").days).toBe(60)
  })
})

describe("applyDay", () => {
  it("ratchets the target up when you pick more than asked", () => {
    const state = applyDay(start(), 180)
    expect(state.target).toBe(180)
    expect(state.lashes).toBe(0)
    expect(state.log[0].nextTarget).toBe(180)
  })

  it("counts one lash per missing pound and denies rations", () => {
    const state = applyDay(start(), 130)
    expect(state.lashes).toBe(20)
    expect(state.daysWithoutRations).toBe(1)
    expect(state.log[0].rationsDenied).toBe(true)
    expect(state.target).toBe(150)
  })

  it("does nothing at all on an exact day", () => {
    const state = applyDay(start(), 150)
    expect(state.target).toBe(150)
    expect(state.lashes).toBe(0)
    expect(state.daysWithoutRations).toBe(0)
    expect(state.log[0].rationsDenied).toBe(false)
  })

  it("never lets the target fall back down", () => {
    const state = play(start(), [200, 100, 120])
    expect(state.target).toBe(200)
    expect(state.lashes).toBe(100 + 80)
  })

  it("charges the raised target from the next day on", () => {
    const state = play(start(), [180, 150])
    expect(state.log[1].target).toBe(180)
    expect(state.log[1].lashes).toBe(30)
  })

  it("records the day the pick applied to", () => {
    const state = play(start(), [150, 150])
    expect(state.log.map((entry) => entry.day)).toEqual([1, 2])
    expect(state.day).toBe(3)
  })

  it("treats a negative pick as nothing picked", () => {
    expect(applyDay(start(), -40).lashes).toBe(150)
  })

  it("stops accepting days once the log is full", () => {
    const state = play(start(150, 2), [150, 150, 10])
    expect(isFinished(state)).toBe(true)
    expect(state.log).toHaveLength(2)
    expect(state.lashes).toBe(0)
  })
})

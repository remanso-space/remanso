import { describe, expect, it } from "vitest"

import { parseMacroplan, PlanParseError } from "./parse"
import { buildPlan } from "./plan"

const TODAY = "2026-06-17" // a Wednesday → week of Mon 2026-06-15

const SOURCE = `
title = "Q3 plan"

[[feature]]
name = "Auth"
start = 2026-06-01
original = 2026-06-15
delivered = 2026-06-15

[[feature]]
name = "Payments"
start = 2026-06-01
original = 2026-06-08
reestimates = [2026-06-22]
status = "at-risk"

[[milestone]]
name = "MVP"
week = 2026-06-15
requires = ["Auth", "Payments"]
`

describe("macroplan model", () => {
  it("derives a render-ready plan from TOML", () => {
    const plan = buildPlan(parseMacroplan(SOURCE), TODAY)

    expect(plan.title).toBe("Q3 plan")
    expect(plan.weeks).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22"
    ])
    expect(plan.nowWeek).toBe("2026-06-15")

    const auth = plan.rows.find((r) => r.name === "Auth")
    expect(auth?.onTime).toBe(true)
    expect(auth?.markers).toContainEqual({
      week: "2026-06-15",
      kind: "delivered-on-time"
    })

    const payments = plan.rows.find((r) => r.name === "Payments")
    expect(payments?.delivered).toBe(false)
    expect(payments?.slipCount).toBe(1)

    expect(plan.milestones[0].unmet).toEqual(["Payments"])
  })

  it("rejects malformed sources with an author-safe error", () => {
    expect(() => parseMacroplan('[[feature]]\nname = "No dates"')).toThrow(
      PlanParseError
    )
  })
})

import { describe, expect, it } from "vitest"

import {
  formatMs,
  formatSeconds,
  parseDuration
} from "@/modules/instruments/duration"

describe("parseDuration", () => {
  it("parses unit forms", () => {
    expect(parseDuration("2m")).toBe(120)
    expect(parseDuration("90s")).toBe(90)
    expect(parseDuration("1h30m")).toBe(5400)
    expect(parseDuration("1h30m15s")).toBe(5415)
  })

  it("treats a bare number as minutes", () => {
    expect(parseDuration("25")).toBe(1500)
  })

  it("is case- and whitespace-insensitive", () => {
    expect(parseDuration(" 2M ")).toBe(120)
  })

  it("rejects empty, invalid, and zero input", () => {
    expect(parseDuration("")).toBeNull()
    expect(parseDuration("soon")).toBeNull()
    expect(parseDuration("2x")).toBeNull()
    expect(parseDuration("0")).toBeNull()
    expect(parseDuration("0m")).toBeNull()
  })
})

describe("formatSeconds", () => {
  it("formats mm:ss", () => {
    expect(formatSeconds(0)).toBe("00:00")
    expect(formatSeconds(90)).toBe("01:30")
    expect(formatSeconds(1500)).toBe("25:00")
  })

  it("adds hours above one hour", () => {
    expect(formatSeconds(5415)).toBe("1:30:15")
  })
})

describe("formatMs", () => {
  it("formats with tenths", () => {
    expect(formatMs(0)).toBe("00:00.0")
    expect(formatMs(3250)).toBe("00:03.2")
    expect(formatMs(61_100)).toBe("01:01.1")
  })
})

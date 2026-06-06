import { afterEach, describe, expect, it, vi } from "vitest"

import { displayLanguage } from "./displayLanguage"

describe("displayLanguage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null when no language code is given", () => {
    expect(displayLanguage()).toBeNull()
    expect(displayLanguage("")).toBeNull()
  })

  it("returns a human-readable name for a known language code", () => {
    expect(displayLanguage("en")).toMatch(/^English/i)
  })

  it("works for French", () => {
    expect(displayLanguage("fr")).toBeTruthy()
  })

  it("returns null and logs a warning when Intl.DisplayNames throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const original = Intl.DisplayNames
    // Force the constructor to throw
    ;(Intl as unknown as { DisplayNames: unknown }).DisplayNames = function () {
      throw new Error("boom")
    }

    try {
      expect(displayLanguage("en")).toBeNull()
      expect(warn).toHaveBeenCalled()
    } finally {
      ;(Intl as unknown as { DisplayNames: unknown }).DisplayNames = original
    }
  })
})

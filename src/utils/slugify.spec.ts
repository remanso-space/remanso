import { describe, expect, it } from "vitest"

import { slugify } from "./slugify"

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("strips diacritics via NFD normalization", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume")
  })

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("a !! b   c__d")).toBe("a-b-c-d")
  })

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---hello---")).toBe("hello")
    expect(slugify("!!!hello!!!")).toBe("hello")
  })

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("")
  })

  it("returns empty string when input is only special characters", () => {
    expect(slugify("!@#$%^")).toBe("")
  })

  it("preserves digits", () => {
    expect(slugify("Note 42")).toBe("note-42")
  })
})

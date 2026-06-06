import { describe, expect, it } from "vitest"

import { isExternalLink } from "./link"

describe("isExternalLink", () => {
  const ORIGIN = window.location.origin

  it("returns false for same-origin absolute URLs", () => {
    expect(isExternalLink(`${ORIGIN}/alice/notes`)).toBe(false)
  })

  it("returns true for an https URL on a different origin", () => {
    expect(isExternalLink("https://github.com/anywhere")).toBe(true)
  })

  it("returns true for an http URL on a different origin", () => {
    expect(isExternalLink("http://example.com")).toBe(true)
  })

  it("returns false for relative paths (no http/https prefix)", () => {
    expect(isExternalLink("/alice/notes")).toBe(false)
    expect(isExternalLink("./neighbor.md")).toBe(false)
  })

  it("returns false for mailto and other non-http schemes", () => {
    expect(isExternalLink("mailto:user@example.com")).toBe(false)
    expect(isExternalLink("ftp://files.example.com")).toBe(false)
  })

  it("returns false for an https URL that happens to start with the origin", () => {
    expect(isExternalLink(`${ORIGIN}/deep/path`)).toBe(false)
  })
})

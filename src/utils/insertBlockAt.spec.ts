import { describe, expect, it } from "vitest"

import { insertBlockAt } from "@/utils/insertBlockAt"

const BLOCK = "![Ma 間 - audio](at://x)"

describe("insertBlockAt", () => {
  it("appends to the end when the offset is null", () => {
    expect(insertBlockAt("one\n\ntwo", null, BLOCK)).toBe(
      `one\n\ntwo\n\n${BLOCK}\n`
    )
  })

  it("appends when the offset is past the end", () => {
    expect(insertBlockAt("one", 999, BLOCK)).toBe(`one\n\n${BLOCK}\n`)
  })

  it("inserts at a blank line between two paragraphs", () => {
    // "one\n" is 4 chars, so offset 4 sits on the empty line.
    expect(insertBlockAt("one\n\ntwo", 4, BLOCK)).toBe(`one\n\n${BLOCK}\n\ntwo`)
  })

  it("splits a paragraph when the caret is mid-line", () => {
    expect(insertBlockAt("hello world", 5, BLOCK)).toBe(
      `hello\n\n${BLOCK}\n\n world`
    )
  })

  it("inserts at the very start without a leading blank line", () => {
    expect(insertBlockAt("one", 0, BLOCK)).toBe(`${BLOCK}\n\none`)
  })

  it("does not stack blank lines when the caret already sits on one", () => {
    expect(insertBlockAt("one\n\n\n\ntwo", 5, BLOCK)).toBe(
      `one\n\n${BLOCK}\n\ntwo`
    )
  })

  it("handles empty content", () => {
    expect(insertBlockAt("", 0, BLOCK)).toBe(`${BLOCK}\n`)
  })

  it("treats a negative offset as the start", () => {
    expect(insertBlockAt("one", -5, BLOCK)).toBe(`${BLOCK}\n\none`)
  })

  it("appends after trailing whitespace rather than inside it", () => {
    expect(insertBlockAt("one\n\n\n", null, BLOCK)).toBe(`one\n\n${BLOCK}\n`)
  })
})

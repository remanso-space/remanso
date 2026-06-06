import { describe, expect, it } from "vitest"

import { decodeBase64ToUTF8, encodeUTF8ToBase64 } from "./decodeBase64ToUTF8"

describe("base64 ↔ UTF-8 round-trip", () => {
  it.each([
    ["ASCII", "Hello, world!"],
    ["multi-byte UTF-8", "Café résumé naïve"],
    ["CJK characters", "こんにちは世界"],
    ["emoji", "👋 🌍 🎉"],
    ["empty string", ""],
    ["newlines and whitespace", "line1\nline2\tend"],
    ["markdown content", "# Title\n\n- [[link]]\n- **bold**"]
  ])("round-trips %s", (_label, input) => {
    expect(decodeBase64ToUTF8(encodeUTF8ToBase64(input))).toBe(input)
  })

  it("encodes ASCII to standard base64", () => {
    expect(encodeUTF8ToBase64("hi")).toBe("aGk=")
  })

  it("decodes standard base64 to ASCII", () => {
    expect(decodeBase64ToUTF8("aGk=")).toBe("hi")
  })
})

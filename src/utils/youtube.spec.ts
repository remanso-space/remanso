import { describe, expect, it } from "vitest"

import { extractYouTubeId } from "./youtube"

describe("extractYouTubeId", () => {
  it("returns null for empty input", () => {
    expect(extractYouTubeId("")).toBeNull()
  })

  it("returns the trimmed string when input is not a valid URL", () => {
    expect(extractYouTubeId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts id from youtu.be short URLs", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts id from youtube.com/watch?v=", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ")
  })

  it("extracts id from youtube.com/embed/", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    )
  })

  it("extracts id from youtube.com/shorts/", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/abc123XYZ")).toBe(
      "abc123XYZ"
    )
  })

  it("extracts id from youtube.com/live/", () => {
    expect(extractYouTubeId("https://www.youtube.com/live/abc123XYZ")).toBe(
      "abc123XYZ"
    )
  })

  it("prefers v= param over path segments", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz")
    ).toBe("dQw4w9WgXcQ")
  })

  it("returns null for non-YouTube hosts", () => {
    expect(
      extractYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ")
    ).toBeNull()
  })

  it("returns null for youtube.com root URL with no id", () => {
    expect(extractYouTubeId("https://www.youtube.com/")).toBeNull()
  })
})

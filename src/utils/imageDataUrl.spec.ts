import { describe, expect, it } from "vitest"

import { imageMimeType, toImageDataUrl } from "./imageDataUrl"

describe("imageMimeType", () => {
  it("maps an svg to the svg mime type", () => {
    expect(imageMimeType("docs/assets/typo.svg")).toBe("image/svg+xml")
  })

  it("maps the common raster extensions", () => {
    expect(imageMimeType("a.png")).toBe("image/png")
    expect(imageMimeType("a.jpg")).toBe("image/jpeg")
    expect(imageMimeType("a.jpeg")).toBe("image/jpeg")
    expect(imageMimeType("a.gif")).toBe("image/gif")
    expect(imageMimeType("a.webp")).toBe("image/webp")
  })

  it("ignores the extension case", () => {
    expect(imageMimeType("LOGO.SVG")).toBe("image/svg+xml")
  })

  it("falls back to jpeg for an unknown extension", () => {
    expect(imageMimeType("a.unknown")).toBe("image/jpeg")
    expect(imageMimeType("noextension")).toBe("image/jpeg")
  })
})

describe("toImageDataUrl", () => {
  it("builds a data url with the mime type of the path", () => {
    expect(toImageDataUrl("docs/assets/typo.svg", "PHN2Zy8+")).toBe(
      "data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+"
    )
  })

  it("strips the whitespace github wraps the base64 payload with", () => {
    expect(toImageDataUrl("a.png", "AAAA\nBBBB\n")).toBe(
      "data:image/png;charset=utf-8;base64,AAAABBBB"
    )
  })
})

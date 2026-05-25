import { describe, expect, it } from "vitest"

import { uniqueFilename } from "./uniqueFilename"

describe("uniqueFilename", () => {
  it("returns basename.ext when nothing collides", () => {
    expect(
      uniqueFilename({
        basename: "myfile",
        extension: ".png",
        existingPaths: ["docs/notes/myfile.md"],
        directory: "docs/notes"
      })
    ).toEqual("myfile.png")
  })

  it("appends -2 on first collision (skips -1)", () => {
    expect(
      uniqueFilename({
        basename: "myfile",
        extension: ".png",
        existingPaths: ["docs/notes/myfile.png"],
        directory: "docs/notes"
      })
    ).toEqual("myfile-2.png")
  })

  it("appends -3 when both base and -2 exist", () => {
    expect(
      uniqueFilename({
        basename: "myfile",
        extension: ".png",
        existingPaths: ["docs/notes/myfile.png", "docs/notes/myfile-2.png"],
        directory: "docs/notes"
      })
    ).toEqual("myfile-3.png")
  })

  it("fills gaps when -3 exists but -2 does not", () => {
    expect(
      uniqueFilename({
        basename: "myfile",
        extension: ".png",
        existingPaths: ["docs/notes/myfile.png", "docs/notes/myfile-3.png"],
        directory: "docs/notes"
      })
    ).toEqual("myfile-2.png")
  })

  it("handles repo-root directory", () => {
    expect(
      uniqueFilename({
        basename: "myfile",
        extension: ".jpg",
        existingPaths: ["myfile.jpg"],
        directory: ""
      })
    ).toEqual("myfile-2.jpg")
  })

  it("does not collide with a different extension", () => {
    expect(
      uniqueFilename({
        basename: "myfile",
        extension: ".png",
        existingPaths: ["docs/myfile.jpg"],
        directory: "docs"
      })
    ).toEqual("myfile.png")
  })
})

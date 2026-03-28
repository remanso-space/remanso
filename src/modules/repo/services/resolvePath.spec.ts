import { describe, expect, it } from "vitest"

import { resolvePath } from "./resolvePath"

describe("resolve path service", () => {
  it("set the absolute path if path to resolve is empty", () => {
    expect(resolvePath("standard/README.md", "")).toEqual("standard/")
  })

  it("returns the path sanitized if there is no absolute path", () => {
    expect(resolvePath("", "./here/note.md")).toEqual("here/note.md")
  })

  it("set the absolute path from the current path", () => {
    expect(resolvePath("standard/README.md", "./other-note.md")).toEqual(
      "standard/other-note.md"
    )
  })

  it("set the absolute path from the current path with multiple level", () => {
    expect(
      resolvePath("standard/you/are/here/README.md", "./other-note.md")
    ).toEqual("standard/you/are/here/other-note.md")
  })

  it("set the absolute path from the current path with a go back in the relative path", () => {
    expect(
      resolvePath("standard/you/are/here/README.md", "../other-note.md")
    ).toEqual("standard/you/are/other-note.md")

    expect(
      resolvePath("standard/you/are/here/README.md", "../../other-note.md")
    ).toEqual("standard/you/other-note.md")

    expect(
      resolvePath("standard/you/are/here/README.md", "./../../other-note.md")
    ).toEqual("standard/you/other-note.md")

    expect(
      resolvePath("standard/you/are/here/README.md", "./../../../other-note.md")
    ).toEqual("standard/other-note.md")
  })
})

import { describe, expect, it } from "vitest"

import {
  filenameToNoteTitle,
  pathToNotePathTitle,
  pathToNoteTitle
} from "./noteTitle"

describe("filenameToNoteTitle", () => {
  it("replaces hyphens with spaces", () => {
    expect(filenameToNoteTitle("my-cool-note")).toBe("my cool note")
  })

  it("wraps slashes with spaces", () => {
    expect(filenameToNoteTitle("dir/sub/file")).toBe("dir / sub / file")
  })

  it("returns empty input unchanged", () => {
    expect(filenameToNoteTitle("")).toBe("")
  })
})

describe("pathToNotePathTitle", () => {
  it("strips the file extension", () => {
    expect(pathToNotePathTitle("note.md")).toBe("note")
  })

  it("filters out README segments", () => {
    expect(pathToNotePathTitle("folder/README.md")).toBe("folder")
  })

  it("preserves multi-level paths and replaces hyphens", () => {
    expect(pathToNotePathTitle("dir/my-sub-dir/my-note.md")).toBe(
      "dir/my sub dir/my note"
    )
  })

  it("handles paths with multiple dots correctly", () => {
    expect(pathToNotePathTitle("a/b.c.md")).toBe("a/b.c")
  })
})

describe("pathToNoteTitle", () => {
  it("returns the last segment of a multi-level path", () => {
    expect(pathToNoteTitle("dir/sub/my-note.md")).toBe("my note")
  })

  it("returns the title for a root-level file", () => {
    expect(pathToNoteTitle("my-note.md")).toBe("my note")
  })

  it("returns empty string for README files at root", () => {
    expect(pathToNoteTitle("README.md")).toBe("")
  })

  it("returns the parent dir name when the file is a README", () => {
    expect(pathToNoteTitle("folder/README.md")).toBe("folder")
  })
})

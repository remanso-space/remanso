import { describe, expect, it } from "vitest"

import { getFileLanguage, isMarkdownPath, isTikzPath } from "./fileLanguage"

describe("isMarkdownPath", () => {
  it.each(["note.md", "dir/note.md", "note.mdx", "DIR/NOTE.MD"])(
    "returns true for %s",
    (path) => {
      expect(isMarkdownPath(path)).toBe(true)
    }
  )

  it.each(["note.txt", "script.ts", "no-extension", "", "image.png"])(
    "returns false for %s",
    (path) => {
      expect(isMarkdownPath(path)).toBe(false)
    }
  )
})

describe("isTikzPath", () => {
  it.each(["graph.tikz", "diagrams/graph.tikz", "GRAPH.TIKZ"])(
    "returns true for %s",
    (path) => {
      expect(isTikzPath(path)).toBe(true)
    }
  )

  it.each(["note.md", "tikz", "graph.tikz.md", ""])(
    "returns false for %s",
    (path) => {
      expect(isTikzPath(path)).toBe(false)
    }
  )
})

describe("getFileLanguage", () => {
  it.each([
    ["sh", "bash"],
    ["bash", "bash"],
    ["js", "javascript"],
    ["mjs", "javascript"],
    ["cjs", "javascript"],
    ["ts", "typescript"],
    ["mts", "typescript"],
    ["md", "markdown"],
    ["mdx", "markdown"],
    ["html", "html"],
    ["htm", "html"],
    ["css", "css"],
    ["scss", "css"],
    ["json", "json"],
    ["jsonc", "json"],
    ["als", "alloy"]
  ])("maps .%s to %s", (ext, lang) => {
    expect(getFileLanguage(`file.${ext}`)).toBe(lang)
  })

  it("matches case-insensitively", () => {
    expect(getFileLanguage("File.TS")).toBe("typescript")
  })

  it("returns null for unknown extensions", () => {
    expect(getFileLanguage("file.xyz")).toBeNull()
  })

  it("returns null for files without an extension", () => {
    expect(getFileLanguage("Makefile")).toBeNull()
  })

  it("returns null for empty input", () => {
    expect(getFileLanguage("")).toBeNull()
  })
})

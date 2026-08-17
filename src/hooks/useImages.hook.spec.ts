import { beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, reactive, ref } from "vue"

// Reactive like the real Pinia store: the repo tree can land after the note.
const store = reactive({
  files: [] as { path: string; sha: string }[]
})

vi.mock("@/modules/repo/store/userRepo.store", () => ({
  useUserRepoStore: () => store
}))

const getCachedFileContent = vi.fn<() => Promise<string | null>>()

vi.mock("@/hooks/useFile.hook", () => ({
  useFile: () => ({ getCachedFileContent })
}))

vi.mock("@/data/data", () => ({
  data: {},
  generateId: (type: string, id: string) => `${type}-${id}`
}))

import { useImages } from "./useImages.hook"

const ALL_FILES = [
  { path: "README.md", sha: "readme-sha" },
  { path: "notes/note.md", sha: "note-sha" },
  { path: "docs/assets/typo.svg", sha: "svg-sha" },
  { path: "notes/cat.png", sha: "png-sha" }
]

const mount = (html: string) => {
  document.body.innerHTML = `<div class="note-display">${html}</div>`
}

const run = (notePath: string | null, content = "rendered") => {
  const trigger = ref(content)
  const scope = effectScope()
  scope.run(() => useImages(() => ".note-display", () => notePath, trigger))
  return { trigger, scope }
}

// The DOM pass awaits nextTick, then a promise per image.
const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await nextTick()
  }
}

const srcOf = (index = 0) =>
  document.querySelectorAll("img")[index]?.getAttribute("src")

describe("useImages", () => {
  beforeEach(() => {
    store.files = [...ALL_FILES]
    getCachedFileContent.mockReset()
    getCachedFileContent.mockResolvedValue("QkFTRTY0")
  })

  it("inlines an svg with the svg mime type, not jpeg", async () => {
    mount('<img src="docs/assets/typo.svg" alt="Typo, o tucano" width="160">')

    run("README.md")
    await settle()

    expect(srcOf()).toBe("data:image/svg+xml;charset=utf-8;base64,QkFTRTY0")
  })

  it("resolves a path relative to the note's own directory", async () => {
    mount('<img src="cat.png">')

    run("notes/note.md")
    await settle()

    expect(srcOf()).toBe("data:image/png;charset=utf-8;base64,QkFTRTY0")
  })

  it("leaves an image that is not in the repo tree alone", async () => {
    mount('<img src="missing.png">')

    run("README.md")
    await settle()

    expect(srcOf()).toBe("missing.png")
  })

  it("leaves an absolute url and an already inlined image alone", async () => {
    mount(
      '<img src="https://example.com/a.png"><img src="data:image/png;base64,AAA">'
    )

    run("README.md")
    await settle()

    expect(srcOf(0)).toBe("https://example.com/a.png")
    expect(srcOf(1)).toBe("data:image/png;base64,AAA")
    expect(getCachedFileContent).not.toHaveBeenCalled()
  })

  it("leaves a .tikz embed for the tikz pass", async () => {
    store.files.push({ path: "graph.tikz", sha: "tikz-sha" })
    mount('<img src="graph.tikz">')

    run("README.md")
    await settle()

    expect(srcOf()).toBe("graph.tikz")
    expect(getCachedFileContent).not.toHaveBeenCalled()
  })

  it("does nothing without a note path to resolve against", async () => {
    mount('<img src="docs/assets/typo.svg">')

    run(null)
    await settle()

    expect(srcOf()).toBe("docs/assets/typo.svg")
  })

  // The README renders from its own request, so it can be on screen before the
  // repo tree lands — the first pass finds no file and has to run again.
  it("inlines the image once the repo tree arrives", async () => {
    store.files = []
    mount('<img src="docs/assets/typo.svg">')

    run("README.md")
    await settle()
    expect(srcOf()).toBe("docs/assets/typo.svg")

    store.files = [...ALL_FILES]
    await settle()

    expect(srcOf()).toBe("data:image/svg+xml;charset=utf-8;base64,QkFTRTY0")
  })

  it("re-runs when the rendered content changes", async () => {
    mount("<p>no image yet</p>")

    const { trigger } = run("README.md")
    await settle()

    mount('<img src="docs/assets/typo.svg">')
    trigger.value = "rendered again"
    await settle()

    expect(srcOf()).toBe("data:image/svg+xml;charset=utf-8;base64,QkFTRTY0")
  })
})

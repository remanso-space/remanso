import { beforeEach, describe, expect, it, vi } from "vitest"

const files = [
  { path: "notes/note.md", sha: "note-sha" },
  { path: "notes/diagrams/graph.tikz", sha: "graph-sha" }
]

vi.mock("@/modules/repo/store/userRepo.store", () => ({
  useUserRepoStore: () => ({ files })
}))

const getCachedFileContent = vi.fn<() => Promise<string | null>>()

vi.mock("@/hooks/useFile.hook", () => ({
  useFile: () => ({ getCachedFileContent })
}))

vi.mock("@/data/data", () => ({
  data: {},
  generateId: (type: string, id: string) => `${type}-${id}`
}))

import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"

import { runTikzEmbeds } from "./runTikzEmbeds"

const TIKZ_SOURCE = "\\begin{document}\n\\draw (0,0) -- (1,1);\n\\end{document}"

const mountNote = (html: string) => {
  document.body.innerHTML = `<div class="note-note-sha">${html}</div>`
}

describe("runTikzEmbeds", () => {
  beforeEach(() => {
    getCachedFileContent.mockReset()
    getCachedFileContent.mockResolvedValue(btoa(TIKZ_SOURCE))
  })

  it("swaps a .tikz embed for a placeholder carrying the file source", async () => {
    mountNote('<p><img src="diagrams/graph.tikz" alt="graph"></p>')

    await runTikzEmbeds(".note-note-sha", "note-sha")

    expect(document.querySelector("img")).toBeNull()
    const placeholder = document.querySelector<HTMLElement>(".tikz")
    expect(placeholder).not.toBeNull()
    expect(decodeBase64ToUTF8(placeholder?.dataset.tikzSource ?? "")).toBe(
      TIKZ_SOURCE
    )
  })

  it("leaves ordinary images alone", async () => {
    mountNote('<p><img src="cat.png"></p>')

    await runTikzEmbeds(".note-note-sha", "note-sha")

    expect(document.querySelector("img")?.getAttribute("src")).toBe("cat.png")
    expect(getCachedFileContent).not.toHaveBeenCalled()
  })

  it("leaves the embed in place when the file is missing from the repo", async () => {
    mountNote('<p><img src="diagrams/missing.tikz"></p>')

    await runTikzEmbeds(".note-note-sha", "note-sha")

    expect(document.querySelector("img")).not.toBeNull()
    expect(document.querySelector(".tikz")).toBeNull()
  })
})

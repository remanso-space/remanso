import { describe, expect, it } from "vitest"

import { parseCardContent } from "@/modules/card/services/parseCardContent"

describe("parseCardContent", () => {
  it("splits the three parts of a card", () => {
    const raw = [
      "# Bayes | 1",
      "",
      "What does the prior encode?",
      "",
      "___",
      "",
      "Belief before the evidence.",
      "",
      "___",
      "",
      "## Références",
      "",
      "- [Bayes](bayes.md)"
    ].join("\n")

    expect(parseCardContent(raw)).toEqual({
      front: "# Bayes | 1\n\nWhat does the prior encode?",
      back: "Belief before the evidence.",
      references: "## Références\n\n- [Bayes](bayes.md)"
    })
  })

  it("accepts a card with no references", () => {
    expect(parseCardContent("front\n___\nback")).toEqual({
      front: "front",
      back: "back",
      references: ""
    })
  })

  it("keeps a separator that belongs to the references", () => {
    const parsed = parseCardContent("front\n___\nback\n___\nrefs\n___\nmore")

    expect(parsed.back).toBe("back")
    expect(parsed.references).toBe("refs\n___\nmore")
  })

  it("treats a file without a separator as a front-only card", () => {
    expect(parseCardContent("just a front")).toEqual({
      front: "just a front",
      back: "",
      references: ""
    })
  })
})

import { describe, expect, it } from "vitest"

import { setCheckboxInMarkdown } from "@/utils/markdownCheckbox"

describe("setCheckboxInMarkdown", () => {
  const list = "- [ ] one\n- [ ] two\n- [x] three\n"

  it("ticks the nth checkbox", () => {
    expect(setCheckboxInMarkdown(list, 1, true)).toBe(
      "- [ ] one\n- [x] two\n- [x] three\n"
    )
  })

  it("unticks the nth checkbox", () => {
    expect(setCheckboxInMarkdown(list, 2, false)).toBe(
      "- [ ] one\n- [ ] two\n- [ ] three\n"
    )
  })

  it("normalises an uppercase mark it rewrites", () => {
    expect(setCheckboxInMarkdown("- [X] done\n", 0, true)).toBe("- [x] done\n")
  })

  it("leaves the source untouched when the index is out of range", () => {
    expect(setCheckboxInMarkdown(list, 9, true)).toBe(list)
  })

  it("counts checkboxes in source order across paragraphs", () => {
    const source = "intro\n\n- [ ] a\n\ntext\n\n- [ ] b\n"
    expect(setCheckboxInMarkdown(source, 1, true)).toBe(
      "intro\n\n- [ ] a\n\ntext\n\n- [x] b\n"
    )
  })
})

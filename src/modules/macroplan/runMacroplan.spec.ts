import { describe, expect, it } from "vitest"

import { encodeUTF8ToBase64 } from "@/utils/decodeBase64ToUTF8"

import { runMacroplan } from "./runMacroplan"

const placeholder = (source: string): HTMLElement => {
  const el = document.createElement("div")
  el.className = "macroplan-block"
  el.dataset.macroplanSource = encodeUTF8ToBase64(source)
  document.body.appendChild(el)
  return el
}

describe("runMacroplan", () => {
  it("mounts the grid onto a valid placeholder", async () => {
    const el = placeholder(
      'title = "Plan"\n\n[[feature]]\nname = "Auth"\nstart = 2026-06-01\noriginal = 2026-06-15\n'
    )

    await runMacroplan(".macroplan-block")

    expect(el.dataset.macroplanRendered).toBe("true")
    expect(el.querySelector(".macroplan")).not.toBeNull()
    expect(el.textContent).toContain("Auth")
    el.remove()
  })

  it("renders the parse error inline for malformed sources", async () => {
    const el = placeholder('[[feature]]\nname = "No dates"')

    await runMacroplan(".macroplan-block")

    expect(el.dataset.macroplanRendered).toBe("error")
    expect(el.querySelector(".macroplan-error")?.textContent).toContain(
      "missing `start`"
    )
    el.remove()
  })
})

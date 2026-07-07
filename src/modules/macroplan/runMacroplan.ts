import { createApp } from "vue"

import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"

const renderMacroplanError = (el: HTMLElement, err: unknown): void => {
  const msg = err instanceof Error ? err.message : String(err)
  el.textContent = ""
  const box = document.createElement("div")
  box.className = "macroplan-error"
  const title = document.createElement("strong")
  title.textContent = "Macroplan error"
  const detail = document.createElement("pre")
  detail.textContent = msg
  box.append(title, detail)
  el.appendChild(box)
}

/**
 * Mount a MacroplanGrid onto every ```macroplan placeholder in scope.
 * The parser (smol-toml + valibot) and the grid component only load
 * when a placeholder actually exists, so notes without a plan pay nothing.
 */
export const runMacroplan = async (querySelector: string): Promise<void> => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(querySelector)
  ).filter((el) => !el.dataset.macroplanRendered)
  if (elements.length === 0) return

  const [{ parseMacroplan }, { buildPlan }, { default: MacroplanGrid }] =
    await Promise.all([
      import("./model/parse"),
      import("./model/plan"),
      import("./components/MacroplanGrid.vue")
    ])

  for (const el of elements) {
    el.dataset.macroplanRendered = "pending"

    const encoded = el.dataset.macroplanSource
    if (!encoded) {
      el.dataset.macroplanRendered = "error"
      continue
    }

    try {
      const plan = buildPlan(parseMacroplan(decodeBase64ToUTF8(encoded)))
      el.textContent = ""
      createApp(MacroplanGrid, { plan }).mount(el)
      el.dataset.macroplanRendered = "true"
    } catch (err) {
      renderMacroplanError(el, err)
      el.dataset.macroplanRendered = "error"
    }
  }
}

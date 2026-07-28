import type { InstrumentTable } from "@/modules/instruments/sibling"

/**
 * Build the DOM an instrument sees as its next sibling. Instruments read the
 * sibling themselves, so tests hand them the rendered markdown rather than
 * pre-parsed data.
 */
export const tableSibling = (table: InstrumentTable): HTMLElement => {
  const cells = (tag: string, values: string[]) =>
    values.map((value) => `<${tag}>${value}</${tag}>`).join("")

  const wrapper = document.createElement("div")
  wrapper.className = "overflow-x-auto"
  wrapper.innerHTML = `<table>
    <thead><tr>${cells("th", table.header)}</tr></thead>
    <tbody>${table.rows
      .map((row) => `<tr>${cells("td", row)}</tr>`)
      .join("")}</tbody>
  </table>`
  return wrapper
}

export const listSibling = (items: string[]): HTMLElement => {
  const list = document.createElement("ul")
  list.innerHTML = items.map((item) => `<li>${item}</li>`).join("")
  return list
}

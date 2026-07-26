import { type App, createApp } from "vue"

import {
  instrumentLoaders,
  type InstrumentName,
  instrumentWantsTable
} from "./registry"

export interface InstrumentTable {
  header: string[]
  rows: string[][]
}

const mounted: { app: App; el: HTMLElement }[] = []

/**
 * Unmount instrument apps whose placeholder left the DOM (a note re-render
 * replaces the whole subtree) so their intervals and audio stop.
 */
const unmountDisconnected = (): void => {
  for (let index = mounted.length - 1; index >= 0; index--) {
    if (mounted[index].el.isConnected) continue
    mounted[index].app.unmount()
    mounted.splice(index, 1)
  }
}

/**
 * For table-fed instruments: read the markdown table rendered right after
 * the placeholder (tables are wrapped in div.overflow-x-auto by the
 * renderer), hide it, and return its cells. The table stays the single
 * source in the note — and the plain-text GitHub fallback.
 */
const extractSiblingTable = (el: HTMLElement): InstrumentTable | undefined => {
  const sibling = el.nextElementSibling
  if (!(sibling instanceof HTMLElement)) return undefined
  const table = sibling.matches("table")
    ? sibling
    : sibling.querySelector(":scope > table")
  if (!table) return undefined

  const cellsOf = (row: Element) =>
    Array.from(row.querySelectorAll("th,td")).map(
      (cell) => cell.textContent?.trim() ?? ""
    )
  const headerRow = table.querySelector("thead tr")
  const rows = Array.from(table.querySelectorAll("tbody tr")).map(cellsOf)
  if (rows.length === 0) return undefined

  sibling.style.display = "none"
  return { header: headerRow ? cellsOf(headerRow) : [], rows }
}

/**
 * Mount an instrument component onto every :::name::: placeholder in scope.
 * Components only load when a placeholder actually exists, so notes without
 * instruments pay nothing.
 */
export const runInstruments = async (querySelector: string): Promise<void> => {
  unmountDisconnected()

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(querySelector)
  ).filter((el) => !el.dataset.instrumentMounted)
  if (elements.length === 0) return

  await Promise.all(
    elements.map(async (el) => {
      const name = el.dataset.instrument as InstrumentName
      const loader = instrumentLoaders[name]
      if (!loader) return
      el.dataset.instrumentMounted = "true"
      const table = instrumentWantsTable[name]
        ? extractSiblingTable(el)
        : undefined
      const component = await loader()
      const app = createApp(component, {
        args: el.dataset.args ?? "",
        name,
        table
      })
      app.mount(el)
      mounted.push({ app, el })
    })
  )
}

/**
 * Every instrument is handed the element rendered right after its
 * `:::name:::` placeholder, whatever that element is. Instruments are
 * polymorphic over it: they try to read the shape they understand and fall
 * back to their own defaults when the sibling is something else (or nothing).
 * That keeps the note the single source — the table or list is also the
 * plain-text GitHub fallback — without a registry of who wants what.
 */

/**
 * What every instrument component receives. Uniform on purpose: declaring
 * `sibling` even when unused keeps Vue from stringifying the element into a
 * `sibling="[object HTMLDivElement]"` fallthrough attribute.
 */
export interface InstrumentProps {
  /** Text after the name in `:::name args:::`, "" when there is none. */
  args: string
  /** Which alias mounted this — `flashcard` and `flashcards` differ. */
  name: string
  /** The element rendered right after the placeholder, if any. */
  sibling?: HTMLElement
}

export interface InstrumentTable {
  header: string[]
  rows: string[][]
}

const cellsOf = (row: Element): string[] =>
  Array.from(row.querySelectorAll("th,td")).map(
    (cell) => cell.textContent?.trim() ?? ""
  )

/**
 * Read the sibling as a markdown table (the renderer wraps tables in
 * `div.overflow-x-auto`). Returns undefined for any other sibling.
 */
export const readTable = (
  sibling?: HTMLElement | null
): InstrumentTable | undefined => {
  if (!(sibling instanceof HTMLElement)) return undefined
  const table = sibling.matches("table")
    ? sibling
    : sibling.querySelector(":scope > table")
  if (!table) return undefined

  const headerRow = table.querySelector("thead tr")
  const rows = Array.from(table.querySelectorAll("tbody tr")).map(cellsOf)
  if (rows.length === 0) return undefined

  return { header: headerRow ? cellsOf(headerRow) : [], rows }
}

/**
 * Read the sibling table and hide it: the instrument now renders that data
 * itself, so showing both would duplicate it on screen.
 */
export const consumeTable = (
  sibling?: HTMLElement | null
): InstrumentTable | undefined => {
  const table = readTable(sibling)
  if (table && sibling) sibling.style.display = "none"
  return table
}

/**
 * Read the sibling as a `<ul>`/`<ol>` and return its item texts. The list
 * stays visible — a readable overview next to the instrument.
 */
export const readList = (
  sibling?: HTMLElement | null
): string[] | undefined => {
  if (!(sibling instanceof HTMLElement) || !sibling.matches("ul,ol")) {
    return undefined
  }
  const items = Array.from(sibling.querySelectorAll(":scope > li")).map(
    (li) => li.textContent?.trim() ?? ""
  )
  return items.length > 0 ? items : undefined
}

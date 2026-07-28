import { describe, expect, it } from "vitest"

import {
  consumeTable,
  readList,
  readTable
} from "@/modules/instruments/sibling"
import { listSibling, tableSibling } from "@/test/instrumentSibling"

const html = (markup: string): HTMLElement => {
  const holder = document.createElement("div")
  holder.innerHTML = markup
  return holder.firstElementChild as HTMLElement
}

describe("readTable", () => {
  it("reads header and rows from the wrapped table", () => {
    const table = readTable(
      tableSibling({ header: ["A", "B"], rows: [["1", "2"]] })
    )
    expect(table).toEqual({ header: ["A", "B"], rows: [["1", "2"]] })
  })

  it("reads a bare table element too", () => {
    const table = readTable(
      html("<table><tbody><tr><td>1</td></tr></tbody></table>")
    )
    expect(table).toEqual({ header: [], rows: [["1"]] })
  })

  it("returns undefined for a sibling that is not a table", () => {
    expect(readTable(listSibling(["one"]))).toBeUndefined()
    expect(readTable(undefined)).toBeUndefined()
  })

  it("returns undefined for a table with no body rows", () => {
    expect(readTable(tableSibling({ header: ["A"], rows: [] }))).toBeUndefined()
  })
})

describe("consumeTable", () => {
  it("hides the table it read — the instrument renders that data itself", () => {
    const sibling = tableSibling({ header: ["A"], rows: [["1"]] })
    expect(consumeTable(sibling)).toBeDefined()
    expect(sibling.style.display).toBe("none")
  })

  it("leaves a sibling it could not read visible", () => {
    const sibling = listSibling(["one"])
    expect(consumeTable(sibling)).toBeUndefined()
    expect(sibling.style.display).toBe("")
  })
})

describe("readList", () => {
  it("reads the top-level items of a ul or ol", () => {
    expect(readList(listSibling(["one", "two"]))).toEqual(["one", "two"])
    expect(readList(html("<ol><li>one</li></ol>"))).toEqual(["one"])
  })

  it("returns undefined for anything else", () => {
    expect(
      readList(tableSibling({ header: [], rows: [["1"]] }))
    ).toBeUndefined()
    expect(readList(html("<ul></ul>"))).toBeUndefined()
    expect(readList(undefined)).toBeUndefined()
  })
})

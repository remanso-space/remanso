import { describe, expect, it } from "vitest"

import { DataType } from "@/data/DataType.enum"
import { RepetitionCard } from "@/modules/card/models/RepetitionCard"
import {
  cardFromEntry,
  cardIdFromPath,
  cardPathFromId,
  entryFromCard,
  mergeRepetitions,
  parseRepetitionFile,
  RepetitionEntries,
  serializeRepetitionFile
} from "@/modules/card/services/repetitionSync"

const entry = (overrides: Partial<RepetitionEntries[string]> = {}) => ({
  level: 2,
  repeatDate: "2026-09-20T00:00:00.000Z",
  needsReview: false,
  updatedAt: "2026-09-12T10:00:00.000Z",
  ...overrides
})

describe("card ids", () => {
  it("round-trips a card path", () => {
    const id = cardIdFromPath("_cards/bayes-01.md")
    expect(id).toBe("RepetitionCard-_cards/bayes-01.md")
    expect(cardPathFromId(id)).toBe("_cards/bayes-01.md")
  })

  it("leaves an unprefixed id alone", () => {
    expect(cardPathFromId("_cards/bayes-01.md")).toBe("_cards/bayes-01.md")
  })
})

describe("entryFromCard", () => {
  it("normalises a legacy Date repeatDate to an ISO string", () => {
    const card: RepetitionCard = {
      _id: cardIdFromPath("_cards/a.md"),
      $type: DataType.RepetitionCard,
      level: 3,
      repeatDate: new Date("2026-09-20T00:00:00.000Z"),
      needsReview: false
    }

    expect(entryFromCard(card)).toEqual({
      level: 3,
      repeatDate: "2026-09-20T00:00:00.000Z",
      needsReview: false,
      updatedAt: "1970-01-01T00:00:00.000Z"
    })
  })

  it("survives a broken date", () => {
    const card = {
      _id: cardIdFromPath("_cards/a.md"),
      $type: DataType.RepetitionCard,
      level: 1,
      repeatDate: "not a date",
      needsReview: false
    } as RepetitionCard

    expect(entryFromCard(card).repeatDate).toBe("1970-01-01T00:00:00.000Z")
  })
})

describe("cardFromEntry", () => {
  it("rebuilds a document with the id derived from the path", () => {
    expect(cardFromEntry("_cards/a.md", entry())).toEqual({
      _id: "RepetitionCard-_cards/a.md",
      $type: DataType.RepetitionCard,
      level: 2,
      repeatDate: "2026-09-20T00:00:00.000Z",
      needsReview: false,
      updatedAt: "2026-09-12T10:00:00.000Z"
    })
  })
})

describe("mergeRepetitions", () => {
  it("keeps the most recently answered side", () => {
    const local = {
      "a.md": entry({ level: 2, updatedAt: "2026-09-12T10:00:00.000Z" })
    }
    const remote = {
      "a.md": entry({ level: 5, updatedAt: "2026-09-12T11:00:00.000Z" })
    }

    expect(mergeRepetitions(local, remote)["a.md"].level).toBe(5)
  })

  it("keeps the local answer when it is the newer one", () => {
    const local = {
      "a.md": entry({ level: 2, updatedAt: "2026-09-12T12:00:00.000Z" })
    }
    const remote = {
      "a.md": entry({ level: 5, updatedAt: "2026-09-12T11:00:00.000Z" })
    }

    expect(mergeRepetitions(local, remote)["a.md"].level).toBe(2)
  })

  it("takes cards only one side knows about", () => {
    const merged = mergeRepetitions(
      { "a.md": entry() },
      { "b.md": entry({ level: 7 }) }
    )

    expect(Object.keys(merged).sort()).toEqual(["a.md", "b.md"])
    expect(merged["b.md"].level).toBe(7)
  })

  it("does not mutate its inputs", () => {
    const local = { "a.md": entry() }
    mergeRepetitions(local, {
      "a.md": entry({ level: 9, updatedAt: "2027-01-01T00:00:00.000Z" })
    })

    expect(local["a.md"].level).toBe(2)
  })
})

describe("parseRepetitionFile", () => {
  it("reads the cards back", () => {
    const raw = serializeRepetitionFile({ "a.md": entry() })
    expect(parseRepetitionFile(raw)).toEqual({ "a.md": entry() })
  })

  it("returns nothing for invalid JSON", () => {
    expect(parseRepetitionFile("{ nope")).toEqual({})
  })

  it("drops malformed entries instead of poisoning the state", () => {
    const raw = JSON.stringify({
      version: 1,
      cards: { "a.md": entry(), "b.md": { level: "high" } }
    })

    expect(Object.keys(parseRepetitionFile(raw))).toEqual(["a.md"])
  })
})

describe("serializeRepetitionFile", () => {
  it("sorts keys and ends with a newline so git diffs stay readable", () => {
    const raw = serializeRepetitionFile({
      "b.md": entry(),
      "a.md": entry()
    })

    expect(raw.endsWith("\n")).toBe(true)
    expect(raw.indexOf('"a.md"')).toBeLessThan(raw.indexOf('"b.md"'))
    expect(JSON.parse(raw).version).toBe(1)
  })
})

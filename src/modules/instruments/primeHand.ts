import type { InstrumentTable } from "./runInstruments"

export interface Person {
  /** Column 1 — the name the ledger keeps. */
  name: string
  /** Column 2 — the life the ledger loses. */
  detail: string
  /** Column 3 (optional) — the output figure the rating is meant to explain. */
  output: string
}

/**
 * The historical notation: planters rated the enslaved as one-quarter,
 * one-half, three-quarters, or a full "prime hand". No values in between.
 */
export const FRACTIONS = [0.25, 0.5, 0.75, 1] as const

const GLYPHS: Record<string, string> = {
  "0.25": "¼",
  "0.5": "½",
  "0.75": "¾",
  "1": "1"
}

/** Read `| Person | Between the lines | Picked |` rows into people. */
export const parsePeople = (table?: InstrumentTable): Person[] =>
  (table?.rows ?? [])
    .map((cells) => ({
      name: cells[0]?.trim() ?? "",
      detail: cells[1]?.trim() ?? "",
      output: cells[2]?.trim() ?? ""
    }))
    .filter((person) => person.name !== "")

/** Snap any slider value onto the nearest allowed fraction of a prime hand. */
export const snapFraction = (value: number): number =>
  FRACTIONS.reduce((closest, fraction) =>
    Math.abs(fraction - value) < Math.abs(closest - value) ? fraction : closest
  )

/** A fraction as the planters wrote it: ¼, ½, ¾, 1. */
export const formatFraction = (fraction: number): string =>
  GLYPHS[String(snapFraction(fraction))]

export const totalHands = (fractions: number[]): number =>
  fractions.reduce((sum, fraction) => sum + fraction, 0)

/** Two decimals at most, trailing zeros trimmed: 3.25, 3.5, 3. */
export const formatHands = (total: number): string =>
  String(Math.round(total * 100) / 100)

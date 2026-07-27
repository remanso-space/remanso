import type { InstrumentTable } from "./runInstruments"

export interface Stage {
  /** Miles between the owner and the row of cotton. */
  miles: number
  /** What reaches the owner at that distance. */
  text: string
}

/** London is roughly 4000 miles from a Mississippi cotton field. */
export const MAX_MILES = 4000

/**
 * The default sequence: a person, then a name and a task, then a rating, then
 * a line in the monthly return, then one number in a portfolio.
 */
export const DEFAULT_STAGES: Stage[] = [
  {
    miles: 0,
    text: "Mary. Fourteen, sized rather than aged so she cannot dispute it. She sings on the third row, beside her mother, and her hands are cracked open at the knuckle."
  },
  { miles: 1, text: "Mary — third row, picking." },
  { miles: 40, text: "Hand, rated ¾." },
  { miles: 600, text: "Return for June, line 14: ¾ hand, 148 lb." },
  { miles: 3000, text: "312 hands." }
]

/** Read `| Miles | What reaches the owner |` rows, sorted by distance. */
export const parseStages = (table?: InstrumentTable): Stage[] => {
  const stages = (table?.rows ?? [])
    .map((cells) => ({
      miles: Number((cells[0] ?? "").replace(/[^\d.]/g, "")),
      text: cells[1]?.trim() ?? ""
    }))
    .filter((stage) => Number.isFinite(stage.miles) && stage.text !== "")
    .sort((a, b) => a.miles - b.miles)

  return stages.length > 0 ? stages : DEFAULT_STAGES
}

/** The last stage the owner has travelled past. Below the first stage, 0. */
export const stageIndexAt = (stages: Stage[], miles: number): number => {
  let index = 0
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].miles <= miles) index = i
  }
  return index
}

/**
 * Slider position (0–100) to miles, logarithmically: the first mile off the
 * row costs as much travel as the last thousand across the Atlantic.
 */
export const sliderToMiles = (position: number): number => {
  const clamped = Math.min(100, Math.max(0, position))
  return Math.round(10 ** ((clamped / 100) * Math.log10(MAX_MILES + 1)) - 1)
}

export const formatMiles = (miles: number): string =>
  `${miles.toLocaleString("en-US")} mi`

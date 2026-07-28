import type { InstrumentTable } from "./runInstruments"

/**
 * One of Baldwin's institutions. `outcome` is what he *knows* — the sorting he
 * can see. `doubt` is the benefit of the doubt granted to it: the probability,
 * stated generously, that this one outcome is an innocent coincidence rather
 * than about colour. Intent stays unknowable; only the doubt is a number.
 */
export interface Institution {
  name: string
  outcome: string
  /** Probability the outcome is innocent coincidence, 0..1. */
  doubt: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Default doubt when a row leaves the column empty or unreadable: one coin-flip
 * of innocence. Chosen so each institution halves what is left to believe in.
 */
const DEFAULT_DOUBT = 0.5

/**
 * Parse a doubt cell into a fraction: "50 %" → 0.5, "0.5" → 0.5, a bare number
 * ≥ 1 is read as a percentage ("50" → 0.5). Garbage falls back to 50 %.
 */
export const parseDoubt = (raw: string): number => {
  const trimmed = (raw ?? "").trim()
  const isPercent = trimmed.includes("%")
  const numeric = Number(trimmed.replace(/[^\d.]/g, ""))
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_DOUBT
  const fraction = isPercent || numeric > 1 ? numeric / 100 : numeric
  return clamp(fraction, 0.001, 1)
}

/**
 * The institutions Baldwin names, each granted a coin-flip of doubt. Figures
 * are pedagogical, not empirical — the point is the collapse, not the decimals.
 * Fallback only: a bare `:::coincidence-stack:::` still renders.
 */
export const DEFAULT_INSTITUTIONS: Institution[] = [
  {
    name: "The church",
    outcome: "Sunday is still the most segregated hour",
    doubt: 0.5
  },
  { name: "The unions", outcome: "I am not in their unions", doubt: 0.5 },
  {
    name: "The real-estate lobby",
    outcome: "It keeps me in the ghetto",
    doubt: 0.5
  },
  {
    name: "The Board of Education",
    outcome: "The textbooks erase my children",
    doubt: 0.5
  },
  {
    name: "The police",
    outcome: "The danger is on every face",
    doubt: 0.5
  }
]

/** Read `| Institution | Ce qu'on sait | Bénéfice du doute |` rows. */
export const parseInstitutions = (table?: InstrumentTable): Institution[] => {
  const institutions = (table?.rows ?? [])
    .map((cells) => ({
      name: cells[0]?.trim() ?? "",
      outcome: cells[1]?.trim() ?? "",
      doubt: parseDoubt(cells[2] ?? "")
    }))
    .filter((institution) => institution.name !== "")

  return institutions.length > 0 ? institutions : DEFAULT_INSTITUTIONS
}

/**
 * Probability that every counted institution is an innocent coincidence at
 * once: the product of their doubts. The empty product is 1 — with nothing
 * examined, nothing has been ruled out.
 */
export const coincidenceProbability = (institutions: Institution[]): number =>
  institutions.reduce((product, institution) => product * institution.doubt, 1)

/** Below this the "just coincidence" story stops being credible. */
export const CREDIBLE_THRESHOLD = 0.1

/** A doubt or probability as a readable percent: 0.03125 → "3.1%", 0.5 → "50%". */
export const formatPercent = (fraction: number): string => {
  const percent = fraction * 100
  const rounded =
    percent < 10 ? Math.round(percent * 10) / 10 : Math.round(percent)
  return `${rounded}%`
}

import type { InstrumentTable } from "./runInstruments"

export interface Toll {
  /** What kills, in the words the world uses for it. */
  cause: string
  /** Deaths per year attributed to that cause. */
  perYear: number
  /** Whether anyone calls this one violence. */
  named: boolean
}

/**
 * Silent causes are institutional violence — the gears Camara calls "silencieux
 * et bien huilés". The named one is the only killing the word is spent on.
 * Orders of magnitude, not precision: the point is the gap, not the decimals.
 */
export const DEFAULT_TOLLS: Toll[] = [
  { cause: "Hunger", perYear: 9_000_000, named: false },
  { cause: "Air nobody chose to breathe", perYear: 6_700_000, named: false },
  { cause: "Work", perYear: 2_780_000, named: false },
  {
    cause: "Water without a pipe to carry it",
    perYear: 1_400_000,
    named: false
  },
  { cause: "Terrorism and riots", perYear: 8_300, named: true }
]

const DAYS_PER_YEAR = 365
const DEFAULT_DAYS_PER_SECOND = 1

export interface GearsParams {
  /** How many days of world time pass per real second. */
  daysPerSecond: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** Parse `:::silent-gears speed=30:::` — 30 days of world time per second. */
export const parseGearsArgs = (args: string): GearsParams => {
  const match = /(?:speed|s)\s*=\s*([\d.]+)/i.exec(args)
  const speed = match ? Number(match[1]) : NaN
  return {
    daysPerSecond:
      Number.isFinite(speed) && speed > 0
        ? clamp(speed, 0.1, DAYS_PER_YEAR)
        : DEFAULT_DAYS_PER_SECOND
  }
}

const truthy = /^(yes|y|oui|o|true|vrai|x|✓|1)$/i

/** Read `| Cause | Deaths per year | Called violence |` rows. */
export const parseTolls = (table?: InstrumentTable): Toll[] => {
  const tolls = (table?.rows ?? [])
    .map((cells) => ({
      cause: cells[0]?.trim() ?? "",
      perYear: Number((cells[1] ?? "").replace(/[^\d.]/g, "")),
      named: truthy.test((cells[2] ?? "").trim())
    }))
    .filter((toll) => toll.cause !== "" && Number.isFinite(toll.perYear))

  return tolls.length > 0 ? tolls : DEFAULT_TOLLS
}

/** Deaths accumulated by a cause after so many days of world time. */
export const tollAt = (toll: Toll, days: number): number =>
  Math.floor((toll.perYear * Math.max(0, days)) / DAYS_PER_YEAR)

const sumAt = (tolls: Toll[], days: number, named: boolean): number =>
  tolls
    .filter((toll) => toll.named === named)
    .reduce((sum, toll) => sum + tollAt(toll, days), 0)

export const namedTotal = (tolls: Toll[], days: number): number =>
  sumAt(tolls, days, true)

export const silentTotal = (tolls: Toll[], days: number): number =>
  sumAt(tolls, days, false)

const rateOf = (tolls: Toll[], named: boolean): number =>
  tolls
    .filter((toll) => toll.named === named)
    .reduce((sum, toll) => sum + toll.perYear, 0)

/**
 * How many uncounted deaths per death that gets called violence. Taken from
 * the yearly rates, not the displayed counters: those are floored to whole
 * deaths, and the named one ticks so rarely that dividing them would saw
 * between the true ratio and twice it between two ticks.
 *
 * Null until the named counter shows at least one death — a ratio quoted
 * against nothing that has happened yet says nothing.
 */
export const unnamedPerNamed = (tolls: Toll[], days: number): number | null => {
  if (namedTotal(tolls, days) === 0) return null
  const named = rateOf(tolls, true)
  if (named === 0) return null
  return Math.round(rateOf(tolls, false) / named)
}

/** Whole days of world time, as years, months of 30 days, and days. */
export const formatElapsed = (days: number): string => {
  const whole = Math.floor(Math.max(0, days))
  const years = Math.floor(whole / DAYS_PER_YEAR)
  const months = Math.floor((whole % DAYS_PER_YEAR) / 30)
  const rest = (whole % DAYS_PER_YEAR) % 30

  const parts: string[] = []
  if (years > 0) parts.push(`${years} y`)
  if (months > 0) parts.push(`${months} mo`)
  if (parts.length === 0 || rest > 0) parts.push(`${rest} d`)
  return parts.join(" ")
}

export const formatCount = (count: number): string =>
  count.toLocaleString("en-US")

import type { InstrumentTable } from "./runInstruments"

/**
 * Le sablier ne compte pas le temps : il compte la finesse à laquelle on ose
 * regarder ce qu'il en reste. Un même stock — le temps qui reste — lu à un
 * grain grossier tient dans un seul geste (« le temps d'une feuille qui
 * tombe ») ; lu à un grain fin, il explose en centaines de milliers d'instants.
 * Le stock ne bouge pas ; seul le compte change.
 *
 * Les chiffres sont des ordres de grandeur, pas des mesures : des nombres ronds
 * qu'on peut tenir dans la tête.
 */
export interface Grain {
  /** Le nom de l'unité à laquelle on compte le temps qui reste. */
  label: string
  /** La durée d'un grain, en jours. */
  days: number
}

const DAYS_PER_YEAR = 365

/** Par défaut, une quarantaine d'années devant soi. */
export const DEFAULT_YEARS = 40

/**
 * L'échelle par défaut, du plus grossier au plus fin : la vie entière vue
 * comme un seul geste, puis l'été, la lune, le jour, l'heure, et l'instant.
 */
export const DEFAULT_GRAINS: Grain[] = [
  { label: "Le temps qui reste", days: DEFAULT_YEARS * DAYS_PER_YEAR },
  { label: "Un été", days: 3 * 30 },
  { label: "Une lune", days: 30 },
  { label: "Un jour", days: 1 },
  { label: "Une heure éveillée", days: 1 / 24 },
  { label: "Une émotion", days: 15 / (24 * 60) }
]

export interface SablierParams {
  /** Le stock : combien de jours de temps il reste, à un ordre de grandeur près. */
  daysLeft: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** Lit un premier nombre, virgule ou point, espaces des milliers tolérés. */
const firstNumber = (text: string): number => {
  const match = /-?\d[\d\s.,]*/.exec(text)
  if (!match) return NaN
  return Number(
    match[0]
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/\.(?=.*\.)/g, "")
  )
}

const UNIT_DAYS: [RegExp, number][] = [
  [/an|ann[ée]e|year/i, DAYS_PER_YEAR],
  [/mois|month/i, 30],
  [/semaine|week/i, 7],
  [/jour|day/i, 1],
  [/heure|hour/i, 1 / 24],
  [/min/i, 1 / (24 * 60)],
  [/sec/i, 1 / (24 * 60 * 60)]
]

/**
 * « 40 ans », « 3 mois », « 15 minutes » en jours. Sans unité reconnue, on lit
 * le nombre comme des jours. NaN si rien de lisible.
 */
export const parseDuration = (text: string): number => {
  const value = firstNumber(text)
  if (!Number.isFinite(value)) return NaN
  const unit = UNIT_DAYS.find(([re]) => re.test(text))
  return value * (unit ? unit[1] : 1)
}

/** Lit `:::sablier years=40:::` ou `days=14600` — le stock à compter. */
export const parseSablierArgs = (args: string): SablierParams => {
  const days = /(?:days|jours|j)\s*=\s*([\d.]+)/i.exec(args)
  const years = /(?:years|ans|an|y)\s*=\s*([\d.]+)/i.exec(args)
  const fromDays = days ? Number(days[1]) : NaN
  const fromYears = years ? Number(years[1]) : NaN
  const daysLeft = Number.isFinite(fromDays)
    ? fromDays
    : Number.isFinite(fromYears)
      ? fromYears * DAYS_PER_YEAR
      : DEFAULT_YEARS * DAYS_PER_YEAR
  return { daysLeft: clamp(daysLeft, 1, 1_000_000) }
}

/** Lit `| Grain | Durée d'un grain |`, trié du plus grossier au plus fin. */
export const parseGrains = (table?: InstrumentTable): Grain[] => {
  const grains = (table?.rows ?? [])
    .map((cells) => ({
      label: cells[0]?.trim() ?? "",
      days: parseDuration(cells[1] ?? "")
    }))
    .filter(
      (grain) =>
        grain.label !== "" && Number.isFinite(grain.days) && grain.days > 0
    )
    .sort((a, b) => b.days - a.days)

  return grains.length > 0 ? grains : DEFAULT_GRAINS
}

/**
 * Combien de grains de cette taille dans le stock. Zéro si le grain est plus
 * gros que ce qui reste. Un grain d'une minute vaut 1/1440 de jour, qui ne
 * divise pas proprement en virgule flottante — d'où le petit coup de pouce
 * relatif avant le plancher, sinon 1 401 600 tomberait à 1 401 599.
 */
export const countAt = (daysLeft: number, grain: Grain): number =>
  Math.floor((Math.max(0, daysLeft) / grain.days) * (1 + 1e-9))

/**
 * Plafond de grains dessinés dans la lentille : au-delà, on ne peut plus poser
 * un point par grain à l'écran. Le nombre, lui, continue d'exploser — c'est le
 * chiffre qui porte l'argument, la nuée de points n'en est que l'ombre.
 */
export const DOT_CAP = 400

/** Combien de points poser à l'écran pour ce compte, plafonnés à DOT_CAP. */
export const visibleDots = (count: number): number =>
  Math.min(Math.max(0, Math.floor(count)), DOT_CAP)

export const formatCount = (count: number): string =>
  count.toLocaleString("en-US")

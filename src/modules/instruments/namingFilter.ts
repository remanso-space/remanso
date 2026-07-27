import type { InstrumentTable } from "./runInstruments"

/** Camara's three violences, in the order he numbers them. */
export type HarmKind = "institutional" | "revolutionary" | "repressive"

export interface HarmEvent {
  text: string
  /** Lives it cost. Zero is allowed — some harm kills nobody. */
  lives: number
  kind: HarmKind
}

export interface Lens {
  label: string
  kinds: HarmKind[]
}

/**
 * The widening definition. The narrowest lens is the conventional one: it sees
 * only the second violence, which is exactly the hypocrisy the note names.
 */
export const LENSES: Lens[] = [
  { label: "What breaks a window", kinds: ["revolutionary"] },
  {
    label: "…and what is done to stop it",
    kinds: ["revolutionary", "repressive"]
  },
  {
    label: "…and what the order costs to keep",
    kinds: ["revolutionary", "repressive", "institutional"]
  }
]

export const DEFAULT_EVENTS: HarmEvent[] = [
  {
    text: "A winter with the gas cut off for unpaid bills.",
    lives: 3200,
    kind: "institutional"
  },
  {
    text: "A garment factory that met the quota and not the building code.",
    lives: 1134,
    kind: "institutional"
  },
  {
    text: "A maternity ward closed; the next one is two hours by bus.",
    lives: 900,
    kind: "institutional"
  },
  {
    text: "The refinery is blockaded. Nobody is hurt.",
    lives: 0,
    kind: "revolutionary"
  },
  { text: "A police station burns.", lives: 2, kind: "revolutionary" },
  { text: "The square is cleared before dawn.", lives: 41, kind: "repressive" },
  {
    text: "Nine years for the man who threw the stone.",
    lives: 0,
    kind: "repressive"
  }
]

const KINDS: Record<string, HarmKind> = {
  institutional: "institutional",
  institutionnelle: "institutional",
  revolutionary: "revolutionary",
  révolutionnaire: "revolutionary",
  revolutionnaire: "revolutionary",
  repressive: "repressive",
  répressive: "repressive"
}

export const parseKind = (raw: string): HarmKind | null =>
  KINDS[raw.trim().toLowerCase()] ?? null

/** Read `| Event | Lives | Kind |` rows. Unknown kinds are dropped. */
export const parseEvents = (table?: InstrumentTable): HarmEvent[] => {
  const events = (table?.rows ?? [])
    .map((cells) => ({
      text: cells[0]?.trim() ?? "",
      lives: Number((cells[1] ?? "").replace(/[^\d.]/g, "")),
      kind: parseKind(cells[2] ?? "")
    }))
    .filter(
      (event): event is HarmEvent =>
        event.text !== "" && Number.isFinite(event.lives) && event.kind !== null
    )

  return events.length > 0 ? events : DEFAULT_EVENTS
}

export const clampLens = (index: number): number =>
  Math.min(LENSES.length - 1, Math.max(0, Math.round(index)))

export const isCounted = (event: HarmEvent, lensIndex: number): boolean =>
  LENSES[clampLens(lensIndex)].kinds.includes(event.kind)

export interface Tally {
  events: number
  lives: number
  totalEvents: number
  totalLives: number
}

export const tallyAt = (events: HarmEvent[], lensIndex: number): Tally => {
  const counted = events.filter((event) => isCounted(event, lensIndex))
  return {
    events: counted.length,
    lives: counted.reduce((sum, event) => sum + event.lives, 0),
    totalEvents: events.length,
    totalLives: events.reduce((sum, event) => sum + event.lives, 0)
  }
}

export const formatLives = (lives: number): string =>
  lives.toLocaleString("en-US")

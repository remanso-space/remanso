import { DataType } from "@/data/DataType.enum"
import { RepetitionCard } from "@/modules/card/models/RepetitionCard"

/**
 * Review state lives in the repo, next to `.remanso.json`, so a session started
 * on the phone keeps its levels on the laptop. IndexedDB stays the fast path;
 * this file is the shared truth between devices.
 */
export const REPETITION_FILE_PATH = ".remanso.cards.json"

export interface RepetitionEntry {
  level: number
  repeatDate: string
  needsReview: boolean
  updatedAt: string
}

/** Keyed by the card's path in the repo, e.g. `_cards/bayes-01.md`. */
export type RepetitionEntries = Record<string, RepetitionEntry>

export interface RepetitionFile {
  version: 1
  cards: RepetitionEntries
}

const ID_PREFIX = `${DataType.RepetitionCard}-`

export const cardIdFromPath = (path: string) => `${ID_PREFIX}${path}`

export const cardPathFromId = (id: string) =>
  id.startsWith(ID_PREFIX) ? id.slice(ID_PREFIX.length) : id

const isoOr = (value: string | Date | undefined | null, fallback: string) => {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

export const entryFromCard = (card: RepetitionCard): RepetitionEntry => ({
  level: card.level,
  repeatDate: isoOr(card.repeatDate, new Date(0).toISOString()),
  needsReview: !!card.needsReview,
  updatedAt: isoOr(card.updatedAt, new Date(0).toISOString())
})

export const cardFromEntry = (
  path: string,
  entry: RepetitionEntry
): RepetitionCard => ({
  _id: cardIdFromPath(path),
  $type: DataType.RepetitionCard,
  level: entry.level,
  repeatDate: entry.repeatDate,
  needsReview: entry.needsReview,
  updatedAt: entry.updatedAt
})

export const sameEntry = (a?: RepetitionEntry, b?: RepetitionEntry) =>
  !!a &&
  !!b &&
  a.level === b.level &&
  a.repeatDate === b.repeatDate &&
  a.needsReview === b.needsReview &&
  a.updatedAt === b.updatedAt

/**
 * Last write wins, per card. Two devices reviewing the same card offline is the
 * only conflict this feature can produce, and the later answer is the one the
 * reader actually remembers giving.
 */
export const mergeRepetitions = (
  local: RepetitionEntries,
  remote: RepetitionEntries
): RepetitionEntries => {
  const merged: RepetitionEntries = { ...local }

  for (const [path, remoteEntry] of Object.entries(remote)) {
    const localEntry = merged[path]
    if (!localEntry || remoteEntry.updatedAt > localEntry.updatedAt) {
      merged[path] = remoteEntry
    }
  }

  return merged
}

const isEntry = (value: unknown): value is RepetitionEntry => {
  if (!value || typeof value !== "object") return false
  const entry = value as Partial<RepetitionEntry>
  return (
    typeof entry.level === "number" &&
    typeof entry.repeatDate === "string" &&
    typeof entry.needsReview === "boolean" &&
    typeof entry.updatedAt === "string"
  )
}

export const parseRepetitionFile = (raw: string): RepetitionEntries => {
  try {
    const parsed = JSON.parse(raw) as Partial<RepetitionFile>
    const cards = parsed?.cards
    if (!cards || typeof cards !== "object") return {}

    return Object.fromEntries(
      Object.entries(cards).filter(([, entry]) => isEntry(entry))
    ) as RepetitionEntries
  } catch {
    return {}
  }
}

/** Sorted keys and a trailing newline: the diffs stay readable in git. */
export const serializeRepetitionFile = (cards: RepetitionEntries): string => {
  const sorted = Object.fromEntries(
    Object.entries(cards).sort(([a], [b]) => a.localeCompare(b))
  )
  return `${JSON.stringify({ version: 1, cards: sorted }, null, 2)}\n`
}

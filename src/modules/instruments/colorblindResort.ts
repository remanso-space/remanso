import type { InstrumentTable } from "./runInstruments"

/**
 * One person taking one action, in one colour, and where the institution places
 * them. The same `person` appears under more than one colour so the split — or
 * its absence — is visible when the colour word is taken away.
 */
export interface Case {
  person: string
  color: string
  destination: string
}

/**
 * Baldwin's institutions, each sorting the same person by colour. Fallback
 * only: a bare `:::colorblind-resort:::` still renders.
 */
export const DEFAULT_CASES: Case[] = [
  {
    person: "A family looking to rent",
    color: "White",
    destination: "The neighbourhood"
  },
  {
    person: "A family looking to rent",
    color: "Black",
    destination: "The ghetto"
  },
  {
    person: "A worker applying to the union",
    color: "White",
    destination: "Inside"
  },
  {
    person: "A worker applying to the union",
    color: "Black",
    destination: "Outside"
  },
  {
    person: "A child at school",
    color: "White",
    destination: "A textbook that shows them"
  },
  {
    person: "A child at school",
    color: "Black",
    destination: "A textbook that erases them"
  }
]

/** Read `| Personne | Couleur | Où l'institution la place |` rows. */
export const parseCases = (table?: InstrumentTable): Case[] => {
  const cases = (table?.rows ?? [])
    .map((cells) => ({
      person: cells[0]?.trim() ?? "",
      color: cells[1]?.trim() ?? "",
      destination: cells[2]?.trim() ?? ""
    }))
    .filter((item) => item.person !== "" && item.destination !== "")

  return cases.length > 0 ? cases : DEFAULT_CASES
}

export interface SortTally {
  /** Persons whose destination depends on their colour. */
  split: number
  /** Distinct persons in the table. */
  total: number
}

/**
 * Count the persons the institution sorts by colour: a person is sorted when
 * their colours map to more than one destination. Independent of whether the
 * colour word is shown — that is the whole point.
 */
export const countSorted = (cases: Case[]): SortTally => {
  const destinations = new Map<string, Set<string>>()
  for (const item of cases) {
    const set = destinations.get(item.person) ?? new Set<string>()
    set.add(item.destination)
    destinations.set(item.person, set)
  }
  let split = 0
  for (const set of destinations.values()) {
    if (set.size > 1) split++
  }
  return { split, total: destinations.size }
}

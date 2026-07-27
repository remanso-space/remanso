/** Where a phase sits in the breath cycle — drives both label and animation. */
export type BreathPhaseKind = "inhale" | "hold-in" | "exhale" | "hold-out"

export interface BreathPhase {
  kind: BreathPhaseKind
  seconds: number
}

export interface BreathPattern {
  phases: BreathPhase[]
  cycles: number
}

/** Box breathing — the pattern `:::breath:::` falls back to. */
const DEFAULT_PATTERN = "4-4-4-4"
const DEFAULT_CYCLES = 6
const MAX_PHASE_SECONDS = 60
const MAX_CYCLES = 99

const CYCLES_RE = /(?:^|\s)x\s*(\d+)$/i
const PATTERN_RE = /^\d+(?:-\d+){1,3}$/

/** Phase kinds by position, so `4-7-8` reads inhale, hold, exhale. */
const KINDS: Record<number, BreathPhaseKind[]> = {
  2: ["inhale", "exhale"],
  3: ["inhale", "hold-in", "exhale"],
  4: ["inhale", "hold-in", "exhale", "hold-out"]
}

/**
 * Parse a dash-separated pattern into phases, dropping zero-second ones
 * (`4-0-8` is a legitimate way to write "no hold"). Null unless both an inhale
 * and an exhale survive — a breath needs the two of them.
 */
const parsePattern = (text: string): BreathPhase[] | null => {
  if (!PATTERN_RE.test(text)) return null
  const numbers = text.split("-").map(Number)
  if (numbers.some((seconds) => seconds > MAX_PHASE_SECONDS)) return null
  const kinds = KINDS[numbers.length]
  const phases = numbers
    .map((seconds, index) => ({ kind: kinds[index], seconds }))
    .filter((phase) => phase.seconds > 0)
  const kindsLeft = new Set(phases.map((phase) => phase.kind))
  if (!kindsLeft.has("inhale") || !kindsLeft.has("exhale")) return null
  return phases
}

/**
 * Parse `:::breath ...:::` args: `4-7-8`, `5-5`, `4-4-4-4 x10`, or nothing at
 * all (box breathing, 6 cycles). Returns null for anything unparsable so the
 * component can show the syntax hint.
 */
export const parseBreath = (args: string): BreathPattern | null => {
  let text = args.trim().toLowerCase()
  let cycles = DEFAULT_CYCLES

  const cyclesMatch = CYCLES_RE.exec(text)
  if (cyclesMatch) {
    cycles = Number(cyclesMatch[1])
    if (cycles < 1 || cycles > MAX_CYCLES) return null
    text = text.slice(0, cyclesMatch.index).trim()
  }

  const phases = parsePattern(text || DEFAULT_PATTERN)
  return phases === null ? null : { phases, cycles }
}

export const breathPhaseLabel = (kind: BreathPhaseKind): string =>
  kind === "inhale" ? "Inhale" : kind === "exhale" ? "Exhale" : "Hold"

/** Smallest circle (fully exhaled) as a fraction of the largest. */
const MIN_SCALE = 0.45

/**
 * Circle scale for a phase at `progress` (0 → 1 through the phase): the lungs
 * fill on the inhale, stay full through the hold, empty on the exhale, and stay
 * empty through the hold after it.
 */
export const breathScale = (
  kind: BreathPhaseKind,
  progress: number
): number => {
  const clamped = Math.min(1, Math.max(0, progress))
  const span = 1 - MIN_SCALE
  switch (kind) {
    case "inhale":
      return MIN_SCALE + span * clamped
    case "exhale":
      return 1 - span * clamped
    case "hold-in":
      return 1
    case "hold-out":
      return MIN_SCALE
  }
}

export const restingScale = MIN_SCALE

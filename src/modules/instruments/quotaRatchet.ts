export interface RatchetParams {
  /** Pounds of cotton expected on day one. */
  target: number
  /** How many days the log runs. */
  days: number
}

export interface DayEntry {
  day: number
  /** The target that applied on that day. */
  target: number
  picked: number
  /** One lash per pound short. */
  lashes: number
  rationsDenied: boolean
  /** The target the day left behind — never lower than it started. */
  nextTarget: number
}

export interface RatchetState {
  params: RatchetParams
  /** The next day to log, 1-based. */
  day: number
  target: number
  lashes: number
  daysWithoutRations: number
  log: DayEntry[]
}

const DEFAULTS: RatchetParams = { target: 150, days: 7 }

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const parsePositive = (raw: string): number | null => {
  const numeric = Number(raw.trim())
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return Math.round(numeric)
}

/** Parse `:::quota-ratchet target=150 days=7:::`. Invalid keys fall back. */
export const parseRatchetArgs = (args: string): RatchetParams => {
  const raw: Record<string, string> = {}
  for (const match of args.matchAll(/(\w+)\s*=\s*(\S+)/g)) {
    raw[match[1].toLowerCase()] = match[2]
  }

  const target = parsePositive(raw.target ?? raw.t ?? "")
  const days = parsePositive(raw.days ?? raw.d ?? "")

  return {
    target: clamp(target ?? DEFAULTS.target, 1, 10000),
    days: clamp(days ?? DEFAULTS.days, 1, 60)
  }
}

export const initialRatchetState = (params: RatchetParams): RatchetState => ({
  params,
  day: 1,
  target: params.target,
  lashes: 0,
  daysWithoutRations: 0,
  log: []
})

export const isFinished = (state: RatchetState): boolean =>
  state.day > state.params.days

/**
 * Log one day. Pick more than the target and the target ratchets up to what
 * you picked — permanently. Pick less and you owe a lash per missing pound
 * and go without rations. The target never falls, so there is no play that
 * leaves you where you started.
 */
export const applyDay = (state: RatchetState, picked: number): RatchetState => {
  if (isFinished(state)) return state

  const pounds = Math.max(0, Math.round(picked))
  const short = Math.max(0, state.target - pounds)
  const nextTarget = Math.max(state.target, pounds)

  const entry: DayEntry = {
    day: state.day,
    target: state.target,
    picked: pounds,
    lashes: short,
    rationsDenied: short > 0,
    nextTarget
  }

  return {
    params: state.params,
    day: state.day + 1,
    target: nextTarget,
    lashes: state.lashes + short,
    daysWithoutRations: state.daysWithoutRations + (short > 0 ? 1 : 0),
    log: [...state.log, entry]
  }
}

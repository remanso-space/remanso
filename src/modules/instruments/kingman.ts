export interface KingmanParams {
  /** ρ — server utilization, a fraction in [0, 1). */
  utilization: number
  /** Ca — coefficient of variation of arrivals. */
  ca: number
  /** Cs — coefficient of variation of service times. */
  cs: number
  /** τ — mean service (process) time, in whatever unit the note uses. */
  serviceTime: number
}

const DEFAULTS: KingmanParams = {
  utilization: 0.85,
  ca: 1,
  cs: 1,
  serviceTime: 10
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** Bare non-negative number, or null for garbage. */
const parseNumber = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return numeric
}

/**
 * Parse a utilization into a fraction: "85%" → 0.85, "0.85" → 0.85, and bare
 * numbers ≥ 1 are treated as percentages ("85" → 0.85). Returns null for
 * garbage.
 */
const parseUtilization = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const isPercent = trimmed.endsWith("%")
  const numeric = Number(isPercent ? trimmed.slice(0, -1) : trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  if (isPercent) return numeric / 100
  return numeric < 1 ? numeric : numeric / 100
}

/**
 * Parse `:::kingman u=85% ca=1 cs=1 t=10:::` args. Missing or invalid keys
 * fall back to ρ=0.85, Ca=Cs=1 (an M/M/1 queue), τ=10.
 */
export const parseKingmanArgs = (args: string): KingmanParams => {
  const raw: Record<string, string> = {}
  for (const match of args.matchAll(/(\w+)\s*=\s*(\S+)/g)) {
    raw[match[1].toLowerCase()] = match[2]
  }

  const utilization = parseUtilization(raw.u ?? raw.utilization ?? "")
  const ca = parseNumber(raw.ca ?? "")
  const cs = parseNumber(raw.cs ?? "")
  const serviceTime = parseNumber(raw.t ?? raw.tau ?? "")

  return {
    utilization: clamp(utilization ?? DEFAULTS.utilization, 0, 0.999),
    ca: clamp(ca ?? DEFAULTS.ca, 0, 10),
    cs: clamp(cs ?? DEFAULTS.cs, 0, 10),
    serviceTime: clamp(
      serviceTime ?? DEFAULTS.serviceTime,
      0.0001,
      Number.MAX_SAFE_INTEGER
    )
  }
}

/** V — the variability factor (Ca² + Cs²) / 2. */
export const variabilityFactor = ({ ca, cs }: KingmanParams): number =>
  (ca * ca + cs * cs) / 2

/** U — the utilization factor ρ / (1 − ρ), which explodes as ρ → 1. */
export const utilizationFactor = ({ utilization }: KingmanParams): number =>
  utilization >= 1 ? Infinity : utilization / (1 - utilization)

/** Kingman's VUT approximation of the mean wait in queue: Wq ≈ V · U · τ. */
export const waitTime = (params: KingmanParams): number =>
  variabilityFactor(params) * utilizationFactor(params) * params.serviceTime

/** Cycle time = wait in queue + service time. */
export const cycleTime = (params: KingmanParams): number =>
  waitTime(params) + params.serviceTime

/**
 * Work in progress via Little's Law: WIP = throughput × cycle time. For a
 * single server the throughput λ = ρ / τ, so WIP = ρ · (cycle time) / τ.
 * With Ca = Cs = 1 this collapses to the exact M/M/1 result ρ / (1 − ρ).
 */
export const wip = (params: KingmanParams): number =>
  (params.utilization / params.serviceTime) * cycleTime(params)

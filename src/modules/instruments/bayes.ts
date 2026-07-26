export interface BayesParams {
  prior: number
  sensitivity: number
  fpr: number
}

const DEFAULTS: BayesParams = { prior: 0.01, sensitivity: 0.9, fpr: 0.05 }

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Parse a single value into a fraction: "1%" → 0.01, "0.01" → 0.01,
 * bare numbers ≥ 1 are treated as percentages ("1" → 0.01, "90" → 0.9).
 * Returns null for garbage.
 */
const parseFraction = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const isPercent = trimmed.endsWith("%")
  const numeric = Number(isPercent ? trimmed.slice(0, -1) : trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  if (isPercent) return numeric / 100
  return numeric < 1 ? numeric : numeric / 100
}

/**
 * Parse `:::bayes prior=1% sensitivity=90% fpr=5%:::` args into fractions.
 * Missing or invalid keys fall back to prior=0.01, sensitivity=0.9, fpr=0.05.
 */
export const parseBayesArgs = (args: string): BayesParams => {
  const values: Record<string, number> = {}
  for (const match of args.matchAll(/(\w+)\s*=\s*([^\s]+)/g)) {
    const key = match[1].toLowerCase()
    const value = parseFraction(match[2])
    if (value !== null) values[key] = value
  }
  return {
    prior: clamp(values.prior ?? DEFAULTS.prior, 0.0001, 1),
    sensitivity: clamp(values.sensitivity ?? DEFAULTS.sensitivity, 0.0001, 1),
    fpr: clamp(values.fpr ?? DEFAULTS.fpr, 0, 1)
  }
}

/** P(condition | positive test) = prior·sens / (prior·sens + (1−prior)·fpr). */
export const posterior = ({ prior, sensitivity, fpr }: BayesParams): number => {
  const numerator = prior * sensitivity
  const denominator = numerator + (1 - prior) * fpr
  if (denominator === 0) return numerator > 0 ? 1 : 0
  return numerator / denominator
}

export interface Population {
  tp: number
  fn: number
  fp: number
  tn: number
}

/**
 * Split a population of `total` people into rounded true/false
 * positive/negative counts; counts always sum to `total`.
 */
export const population = (
  { prior, sensitivity, fpr }: BayesParams,
  total = 1000
): Population => {
  const sick = Math.round(total * prior)
  const healthy = total - sick
  const tp = Math.round(sick * sensitivity)
  const fn = sick - tp
  const fp = Math.round(healthy * fpr)
  const tn = healthy - fp
  return { tp, fn, fp, tn }
}

import { clamp, parseArgPairs, parseFraction } from "./parseArgs"

export interface BayesParams {
  prior: number
  sensitivity: number
  fpr: number
}

const DEFAULTS: BayesParams = { prior: 0.01, sensitivity: 0.9, fpr: 0.05 }

/**
 * Parse `:::bayes prior=1% sensitivity=90% fpr=5%:::` args into fractions.
 * Missing or invalid keys fall back to prior=0.01, sensitivity=0.9, fpr=0.05.
 */
export const parseBayesArgs = (args: string): BayesParams => {
  const raw = parseArgPairs(args)
  const fraction = (key: string) => parseFraction(raw[key] ?? "")

  return {
    prior: clamp(fraction("prior") ?? DEFAULTS.prior, 0.0001, 1),
    sensitivity: clamp(
      fraction("sensitivity") ?? DEFAULTS.sensitivity,
      0.0001,
      1
    ),
    fpr: clamp(fraction("fpr") ?? DEFAULTS.fpr, 0, 1)
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

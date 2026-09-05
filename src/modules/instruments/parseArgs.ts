/** Keep `value` inside [min, max]. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Split `key=value key2=value2` directive args into a lowercase-keyed map of
 * raw strings. Each instrument then reads the keys it knows, with its own
 * aliases and its own idea of what a valid value is.
 */
export const parseArgPairs = (args: string): Record<string, string> => {
  const raw: Record<string, string> = {}
  for (const match of args.matchAll(/(\w+)\s*=\s*(\S+)/g)) {
    raw[match[1].toLowerCase()] = match[2]
  }
  return raw
}

/**
 * Parse a single value into a fraction: "1%" → 0.01, "0.01" → 0.01,
 * bare numbers ≥ 1 are treated as percentages ("1" → 0.01, "90" → 0.9).
 * Returns null for garbage.
 */
export const parseFraction = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const isPercent = trimmed.endsWith("%")
  const numeric = Number(isPercent ? trimmed.slice(0, -1) : trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  if (isPercent) return numeric / 100
  return numeric < 1 ? numeric : numeric / 100
}

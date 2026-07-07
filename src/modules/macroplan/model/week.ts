// Week math. A "Week" is identified by the ISO date (yyyy-mm-dd) of its Monday.
// ISO yyyy-mm-dd strings sort lexicographically == chronologically, so plain
// string comparison (`<`, `<=`) is valid week ordering — we lean on that.

export type WeekId = string // 'yyyy-mm-dd', always a Monday

/**
 * Extract a yyyy-mm-dd string from a TOML date (smol-toml's `TomlDate.toISOString()`
 * returns the authored local date, e.g. "2026-06-01") or a plain string.
 */
export function toYmd(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "string") return value.slice(0, 10)
  throw new Error(`expected a date, got ${JSON.stringify(value)}`)
}

// Anchor at UTC noon so day-of-week / day arithmetic never crosses a DST or
// timezone boundary.
function utcNoon(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function fmt(dt: Date): string {
  return dt.toISOString().slice(0, 10)
}

/** The Monday (yyyy-mm-dd) of the ISO week containing the given date. */
export function mondayOf(value: unknown): WeekId {
  const dt = utcNoon(toYmd(value))
  const dow = dt.getUTCDay() // 0=Sun .. 6=Sat
  const shift = dow === 0 ? -6 : 1 - dow
  dt.setUTCDate(dt.getUTCDate() + shift)
  return fmt(dt)
}

/** Add n weeks to a Monday WeekId (n may be negative). */
export function addWeeks(week: WeekId, n: number): WeekId {
  const dt = utcNoon(week)
  dt.setUTCDate(dt.getUTCDate() + n * 7)
  return fmt(dt)
}

/** Inclusive list of Monday WeekIds from start..end (both must already be Mondays). */
export function weekRange(start: WeekId, end: WeekId): WeekId[] {
  if (start > end) return [start]
  const weeks: WeekId[] = []
  for (let w = start; w <= end; w = addWeeks(w, 1)) weeks.push(w)
  return weeks
}

/** Short column label for a week, e.g. "Jun 15". */
export function weekLabel(week: WeekId): string {
  return utcNoon(week).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  })
}

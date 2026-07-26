const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/

/**
 * Parse a timer duration into seconds: `2m`, `90s`, `1h30m`, or a bare
 * number meaning minutes. Returns null for empty, invalid, or zero input.
 */
export const parseDuration = (input: string): number | null => {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed) * 60
    return seconds > 0 ? seconds : null
  }
  const match = DURATION_RE.exec(trimmed)
  if (!match || (!match[1] && !match[2] && !match[3])) return null
  const seconds =
    Number(match[1] ?? 0) * 3600 +
    Number(match[2] ?? 0) * 60 +
    Number(match[3] ?? 0)
  return seconds > 0 ? seconds : null
}

export const formatSeconds = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}

/** Stopwatch display with tenths: mm:ss.t (h:mm:ss.t above one hour). */
export const formatMs = (ms: number): string => {
  const tenths = Math.floor(ms / 100) % 10
  return `${formatSeconds(Math.floor(ms / 1000))}.${tenths}`
}

/**
 * Seconds as `m:ss`, or `h:mm:ss` once it runs past an hour. Returns null for a
 * missing or nonsensical length so a caller can drop the element entirely
 * rather than render "0:00".
 */
export const formatDuration = (totalSec?: number | null): string | null => {
  if (!totalSec || totalSec < 0 || !Number.isFinite(totalSec)) return null

  const total = Math.floor(totalSec)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

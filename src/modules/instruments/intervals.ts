import { parseDuration } from "./duration"

export interface IntervalStep {
  seconds: number
  label: string
}

const REPEAT_RE = /(?:^|\s)x\s*(\d+)$/i

/**
 * Parse one step: a duration (parseDuration syntax), an optional label, and
 * an optional trailing `xN` / `x N` repeat (N >= 2) that expands the step
 * into numbered copies ("label 1/6" ... or "1/6" ... without a label).
 */
const parseStep = (step: string): IntervalStep[] | null => {
  let text = step.trim()
  if (!text) return null
  let repeat = 1
  const repeatMatch = REPEAT_RE.exec(text)
  if (repeatMatch) {
    repeat = Number(repeatMatch[1])
    if (repeat < 2) return null
    text = text.slice(0, repeatMatch.index).trim()
  }
  const spaceIndex = text.search(/\s/)
  const durationPart = spaceIndex === -1 ? text : text.slice(0, spaceIndex)
  const label = spaceIndex === -1 ? "" : text.slice(spaceIndex).trim()
  const seconds = parseDuration(durationPart)
  if (seconds === null) return null
  if (repeat === 1) return [{ seconds, label }]
  return Array.from({ length: repeat }, (_, i) => ({
    seconds,
    label: label ? `${label} ${i + 1}/${repeat}` : `${i + 1}/${repeat}`
  }))
}

/**
 * Parse `:::intervals ...:::` args into a flat list of steps, e.g.
 * `15m échauffement, 1m gainage, 2m récup` or `30s x6`. Strict: empty args
 * or any unparsable step invalidates the whole list (null).
 */
export const parseIntervals = (args: string): IntervalStep[] | null => {
  if (!args.trim()) return null
  const steps: IntervalStep[] = []
  for (const part of args.split(",")) {
    const parsed = parseStep(part)
    if (parsed === null) return null
    steps.push(...parsed)
  }
  return steps.length > 0 ? steps : null
}

/**
 * Parse one markdown list item, `label | duration` (either order), into
 * steps by reformatting to parseStep's `duration label` syntax. A bare item
 * with no pipe goes straight to parseStep, keeping `xN` repeat support.
 */
const parseListItem = (item: string): IntervalStep[] | null => {
  const text = item.trim()
  if (!text) return null
  const pipe = text.indexOf("|")
  if (pipe === -1) return parseStep(text)
  const left = text.slice(0, pipe).trim()
  const right = text.slice(pipe + 1).trim()
  const [duration, label] =
    parseDuration(right) !== null ? [right, left] : [left, right]
  return parseStep(label ? `${duration} ${label}` : duration)
}

/**
 * Parse a markdown list (each item `label | duration`) into steps — lets a
 * note keep the steps as a normal, GitHub-readable list instead of duplicating
 * them in the `:::intervals ...:::` args. Any unparsable item invalidates all.
 */
export const parseIntervalsFromList = (
  items: string[]
): IntervalStep[] | null => {
  const steps: IntervalStep[] = []
  for (const item of items) {
    const parsed = parseListItem(item)
    if (parsed === null) return null
    steps.push(...parsed)
  }
  return steps.length > 0 ? steps : null
}

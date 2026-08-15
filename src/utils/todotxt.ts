// Parser / serializer for the todo.txt format.
// Spec reference: https://github.com/todotxt/todo.txt

export interface Task {
  raw: string
  completed: boolean
  priority?: string
  completionDate?: string
  creationDate?: string
  body: string
}

export interface BlankLine {
  blank: true
  raw: string
}

export type FileLine = Task | BlankLine

export const isBlank = (line: FileLine): line is BlankLine =>
  (line as BlankLine).blank === true

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PRIORITY_RE = /^\(([A-Z])\)$/
const PROJECT_TOKEN_RE = /(?:^|\s)\+(\S+)/g
const CONTEXT_TOKEN_RE = /(?:^|\s)@(\S+)/g
// Match key:value tags but skip URL-like values (anything containing a slash)
// to avoid grabbing the scheme of `https://example.com`.
const TAG_TOKEN_RE = /(?:^|\s)([A-Za-z][A-Za-z0-9_-]*):([^\s/]+)/g

const tryConsume = (
  rest: string,
  predicate: (token: string) => boolean
): { token: string; rest: string } | null => {
  const match = rest.match(/^(\S+)(\s+|$)/)
  if (!match || !predicate(match[1])) return null
  return { token: match[1], rest: rest.slice(match[0].length) }
}

export const parseLine = (line: string): Task => {
  let rest = line
  let completed = false
  let priority: string | undefined
  let completionDate: string | undefined
  let creationDate: string | undefined

  if (rest.startsWith("x ")) {
    completed = true
    rest = rest.slice(2)

    const dateAttempt = tryConsume(rest, (t) => DATE_RE.test(t))
    if (dateAttempt) {
      completionDate = dateAttempt.token
      rest = dateAttempt.rest
    }
  }

  const priorityAttempt = tryConsume(rest, (t) => PRIORITY_RE.test(t))
  if (priorityAttempt) {
    priority = priorityAttempt.token.slice(1, 2)
    rest = priorityAttempt.rest
  }

  const creationAttempt = tryConsume(rest, (t) => DATE_RE.test(t))
  if (creationAttempt) {
    creationDate = creationAttempt.token
    rest = creationAttempt.rest
  }

  return {
    raw: line,
    completed,
    priority,
    completionDate,
    creationDate,
    body: rest
  }
}

export const serializeTask = (task: Task): string => {
  const parts: string[] = []
  if (task.completed) {
    parts.push("x")
    if (task.completionDate) parts.push(task.completionDate)
  }
  if (task.priority) parts.push(`(${task.priority})`)
  if (task.creationDate) parts.push(task.creationDate)
  if (task.body.length) parts.push(task.body)
  return parts.join(" ")
}

export const parseFile = (text: string): FileLine[] => {
  const lines = text.split("\n")
  // Drop the trailing empty element produced by a final newline.
  // We re-add a trailing newline in serializeFile when there was one in the source.
  const trailing = lines.length > 0 && lines[lines.length - 1] === ""
  const meaningful = trailing ? lines.slice(0, -1) : lines

  return meaningful.map((line) => {
    if (line.trim() === "") return { blank: true, raw: line }
    return parseLine(line)
  })
}

export const serializeFile = (
  items: FileLine[],
  { trailingNewline = true }: { trailingNewline?: boolean } = {}
): string => {
  const lines = items.map((item) =>
    isBlank(item) ? item.raw : serializeTask(item)
  )
  return lines.join("\n") + (trailingNewline ? "\n" : "")
}

const collectTokens = (body: string, re: RegExp): string[] => {
  const out: string[] = []
  for (const match of body.matchAll(re)) {
    out.push(match[1])
  }
  return out
}

export const projectsOf = (task: Task): string[] =>
  collectTokens(task.body, PROJECT_TOKEN_RE)

export const contextsOf = (task: Task): string[] =>
  collectTokens(task.body, CONTEXT_TOKEN_RE)

export const tagsOf = (task: Task): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const match of task.body.matchAll(TAG_TOKEN_RE)) {
    out[match[1]] = match[2]
  }
  return out
}

export type BodySegment =
  | { kind: "text"; value: string }
  | { kind: "project" | "context"; value: string }
  | { kind: "due" | "rec"; value: string }

// Split a task body into display segments. `due:VALUE` and `rec:VALUE` tags
// get their own segment kinds so the UI can render them as themed chips;
// `+project` and `@context` tokens become project/context segments.
// All tokens only count when they sit at the start of the body or after
// whitespace — so mid-word `@` (e.g. `boss@example.com`) stays as text.
export const segmentBody = (body: string): BodySegment[] => {
  const segments: BodySegment[] = []
  const re = /(due|rec):(\S+)|([+@])(\S+)/g
  let last = 0
  for (const match of body.matchAll(re)) {
    const start = match.index ?? 0
    const prevChar = start > 0 ? body[start - 1] : " "
    if (!/\s/.test(prevChar)) continue
    if (start > last) {
      segments.push({ kind: "text", value: body.slice(last, start) })
    }
    if (match[1]) {
      segments.push({
        kind: match[1] as "due" | "rec",
        value: match[2]
      })
    } else {
      segments.push({
        kind: match[3] === "+" ? "project" : "context",
        value: match[4]
      })
    }
    last = start + match[0].length
  }
  if (last < body.length) {
    segments.push({ kind: "text", value: body.slice(last) })
  }
  return segments
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Remove a `+project` or `@context` token from a task body.
// Anchored on `(^|\s)` so mid-word matches (e.g. inside email addresses) are not touched.
export const removeTokenFromBody = (
  body: string,
  prefix: "+" | "@",
  value: string
): string => {
  const re = new RegExp(
    `(?:^|\\s)\\${prefix}${escapeRegex(value)}(?=\\s|$)`,
    "g"
  )
  return body
    .replace(re, "")
    .replace(/[ \t]+/g, " ")
    .trim()
}

// Remove a `key:value` tag (e.g. `due:2025-01-15`) from a task body.
export const removeTagFromBody = (
  body: string,
  key: string,
  value: string
): string => {
  const re = new RegExp(
    `(?:^|\\s)${escapeRegex(key)}:${escapeRegex(value)}(?=\\s|$)`,
    "g"
  )
  return body
    .replace(re, "")
    .replace(/[ \t]+/g, " ")
    .trim()
}

export interface FilterDefaults {
  projects?: string[]
  contexts?: string[]
  priority?: string
}

// Stamp a task with the tokens the current filter view implies, so a task
// added while a filter is on actually matches it instead of vanishing the
// moment it is created. Tokens already typed by hand win: an explicit
// priority is never overwritten and a project/context is never duplicated.
export const applyFilterDefaults = (
  task: Task,
  { projects = [], contexts = [], priority }: FilterDefaults
): Task => {
  const existingProjects = projectsOf(task)
  const existingContexts = contextsOf(task)
  const tokens = [
    ...projects.filter((p) => !existingProjects.includes(p)).map((p) => `+${p}`),
    ...contexts.filter((c) => !existingContexts.includes(c)).map((c) => `@${c}`)
  ]
  const body = [task.body.trim(), ...tokens].filter(Boolean).join(" ")
  return { ...task, body, priority: task.priority ?? priority }
}

const todayIso = (now: Date): string => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const parseDateStr = (s: string): Date | null => {
  if (!DATE_RE.test(s)) return null
  const [y, mo, d] = s.split("-").map(Number)
  return new Date(y, mo - 1, d)
}

const addInterval = (base: Date, n: number, unit: string): Date => {
  const d = new Date(base)
  switch (unit.toLowerCase()) {
    case "d":
      d.setDate(d.getDate() + n)
      break
    case "w":
      d.setDate(d.getDate() + n * 7)
      break
    case "m":
      d.setMonth(d.getMonth() + n)
      break
    case "y":
      d.setFullYear(d.getFullYear() + n)
      break
  }
  return d
}

const REC_RE = /^\+?(\d+)([dwmyDWMY])$/

// When a recurring task is completed, build a new open task with the next due date.
// Strict mode (rec:+Nd): base date is the existing due: date (or today if absent).
// Non-strict (rec:Nd): base date is today (completion date).
// Returns null when the task has no valid rec: tag.
export const applyRecurrence = (task: Task, now = new Date()): Task | null => {
  const tags = tagsOf(task)
  const rec = tags["rec"]
  if (!rec) return null
  const m = rec.match(REC_RE)
  if (!m) return null

  const strict = rec.startsWith("+")
  const n = parseInt(m[1], 10)
  const unit = m[2]

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let base = today
  if (strict && tags["due"]) {
    const parsed = parseDateStr(tags["due"])
    if (parsed) base = parsed
  }

  const nextDate = addInterval(base, n, unit)
  const nextDue = todayIso(nextDate)

  let newBody = task.body
  if (tags["due"]) {
    newBody = removeTagFromBody(newBody, "due", tags["due"])
  }
  newBody = (newBody.trim() + ` due:${nextDue}`).trim()

  return {
    raw: "",
    completed: false,
    priority: task.priority,
    creationDate: todayIso(now),
    completionDate: undefined,
    body: newBody
  }
}

// Toggle the completed state of a task.
// On complete: stamp today's completion date. Priority stays in place per spec.
// On uncomplete: drop completion date but leave the rest of the line as-is —
// we deliberately do not try to recover any original priority that may have
// been stashed in a `pri:X` tag.
export const toggleCompleted = (task: Task, now = new Date()): Task => {
  if (task.completed) {
    return {
      ...task,
      completed: false,
      completionDate: undefined
    }
  }
  return {
    ...task,
    completed: true,
    completionDate: todayIso(now)
  }
}

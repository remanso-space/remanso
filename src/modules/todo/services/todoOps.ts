import { TaskKey, TodoOp } from "@/modules/todo/models/TodoOp"
import { FileLine, isBlank, parseLine, serializeTask } from "@/utils/todotxt"

export const keyId = (key: TaskKey): string => `${key.occurrence}::${key.body}`

export const taskKeyOf = (lines: FileLine[], index: number): TaskKey => {
  const line = lines[index]
  if (!line || isBlank(line)) return { body: "", occurrence: 0 }

  let occurrence = 0
  for (let i = 0; i < index; i++) {
    const other = lines[i]
    if (!isBlank(other) && other.body === line.body) occurrence++
  }
  return { body: line.body, occurrence }
}

export const findByKey = (lines: FileLine[], key: TaskKey): number => {
  let seen = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isBlank(line) || line.body !== key.body) continue
    if (seen === key.occurrence) return i
    seen++
  }
  return -1
}

const rawOf = (line: FileLine): string =>
  isBlank(line) ? line.raw : serializeTask(line)

const countRaw = (lines: FileLine[], raw: string): number =>
  lines.filter((line) => rawOf(line) === raw).length

/**
 * Replay pending ops onto `base` — the lines as they currently stand on the
 * remote, which may have moved on since `snapshot` was taken.
 *
 * An op whose task is no longer there is dropped: the remote deleted or
 * renamed it, and there is nothing sensible to apply it to. `add` is the one
 * op with no key, so it is deduped against the snapshot instead: a line the
 * remote gained that we never saw is taken to be our own write whose response
 * we lost (a PUT that landed just as the connection died). Adds we still owe
 * beyond that count are appended, so asking twice for the same task twice
 * still yields two lines.
 */
export const applyOps = (
  base: FileLine[],
  ops: TodoOp[],
  { snapshot = [] }: { snapshot?: FileLine[] } = {}
): FileLine[] => {
  const lines = [...base]
  const addedByRemote = new Map<string, number>()

  for (const op of ops) {
    if (op.type === "add") {
      const gained = countRaw(base, op.raw) - countRaw(snapshot, op.raw)
      const alreadyCredited = addedByRemote.get(op.raw) ?? 0
      if (alreadyCredited < gained) {
        addedByRemote.set(op.raw, alreadyCredited + 1)
        continue
      }
      lines.push(parseLine(op.raw))
      continue
    }

    const index = findByKey(lines, op.key)
    if (index === -1) continue

    if (op.type === "set") lines[index] = parseLine(op.raw)
    else lines.splice(index, 1)
  }

  return lines
}

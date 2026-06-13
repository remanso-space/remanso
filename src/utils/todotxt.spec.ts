import { describe, expect, it } from "vitest"

import {
  contextsOf,
  isBlank,
  parseFile,
  parseLine,
  projectsOf,
  removeTagFromBody,
  removeTokenFromBody,
  segmentBody,
  serializeFile,
  serializeTask,
  tagsOf,
  toggleCompleted
} from "./todotxt"

describe("todotxt parseLine", () => {
  it("parses a plain task with no metadata", () => {
    const task = parseLine("Pick up groceries")
    expect(task.completed).toBe(false)
    expect(task.priority).toBeUndefined()
    expect(task.completionDate).toBeUndefined()
    expect(task.creationDate).toBeUndefined()
    expect(task.body).toBe("Pick up groceries")
  })

  it("parses priority + creation date + body", () => {
    const task = parseLine("(A) 2024-01-15 Call Mom +Family @phone")
    expect(task.priority).toBe("A")
    expect(task.creationDate).toBe("2024-01-15")
    expect(task.body).toBe("Call Mom +Family @phone")
  })

  it("parses a completed task with completion + creation dates", () => {
    const task = parseLine("x 2024-01-20 (A) 2024-01-15 Finish report")
    expect(task.completed).toBe(true)
    expect(task.completionDate).toBe("2024-01-20")
    expect(task.priority).toBe("A")
    expect(task.creationDate).toBe("2024-01-15")
    expect(task.body).toBe("Finish report")
  })

  it("parses a completed task with no completion date", () => {
    const task = parseLine("x Buy milk")
    expect(task.completed).toBe(true)
    expect(task.completionDate).toBeUndefined()
    expect(task.body).toBe("Buy milk")
  })

  it("does not treat uppercase X as completion", () => {
    const task = parseLine("X-ray appointment")
    expect(task.completed).toBe(false)
    expect(task.body).toBe("X-ray appointment")
  })

  it("does not match a lowercase priority", () => {
    const task = parseLine("(a) lowercase priority is body text")
    expect(task.priority).toBeUndefined()
    expect(task.body).toBe("(a) lowercase priority is body text")
  })
})

describe("todotxt serializeTask", () => {
  it("round-trips a complex task", () => {
    const input = "x 2024-01-20 (A) 2024-01-15 Finish report +work @office"
    expect(serializeTask(parseLine(input))).toBe(input)
  })

  it("round-trips a plain task", () => {
    const input = "Buy milk"
    expect(serializeTask(parseLine(input))).toBe(input)
  })

  it("round-trips priority + body", () => {
    const input = "(B) Walk the dog"
    expect(serializeTask(parseLine(input))).toBe(input)
  })

  it("drops completion date when task is not completed", () => {
    const task = parseLine("(A) 2024-01-15 Hello")
    const out = serializeTask({ ...task, completionDate: "2024-02-01" })
    expect(out).toBe("(A) 2024-01-15 Hello")
  })
})

describe("todotxt projectsOf / contextsOf / tagsOf", () => {
  it("extracts projects", () => {
    const task = parseLine("Plan trip +Travel +Family @home")
    expect(projectsOf(task)).toEqual(["Travel", "Family"])
  })

  it("extracts contexts", () => {
    const task = parseLine("Call +Family @phone @home")
    expect(contextsOf(task)).toEqual(["phone", "home"])
  })

  it("extracts key:value tags", () => {
    const task = parseLine("Finish report due:2024-02-01 pri:A")
    expect(tagsOf(task)).toEqual({ due: "2024-02-01", pri: "A" })
  })

  it("does not treat an email address as a context", () => {
    const task = parseLine("Email boss at boss@example.com")
    expect(contextsOf(task)).toEqual([])
  })

  it("does not treat a URL scheme as a tag", () => {
    const task = parseLine("Read https://example.com later")
    expect(tagsOf(task)).toEqual({})
  })
})

describe("todotxt segmentBody", () => {
  it("splits text + project + context", () => {
    expect(segmentBody("Call Mom +Family @phone")).toEqual([
      { kind: "text", value: "Call Mom " },
      { kind: "project", value: "Family" },
      { kind: "text", value: " " },
      { kind: "context", value: "phone" }
    ])
  })

  it("keeps mid-word @ as text", () => {
    expect(segmentBody("Email boss@example.com")).toEqual([
      { kind: "text", value: "Email boss@example.com" }
    ])
  })

  it("handles a token at the start", () => {
    expect(segmentBody("@phone Call Mom")).toEqual([
      { kind: "context", value: "phone" },
      { kind: "text", value: " Call Mom" }
    ])
  })

  it("recognizes due: and rec: as their own segments", () => {
    expect(segmentBody("Pay rent due:2025-01-15 rec:1m")).toEqual([
      { kind: "text", value: "Pay rent " },
      { kind: "due", value: "2025-01-15" },
      { kind: "text", value: " " },
      { kind: "rec", value: "1m" }
    ])
  })

  it("does not match due: inside a word", () => {
    expect(segmentBody("xdue:foo")).toEqual([
      { kind: "text", value: "xdue:foo" }
    ])
  })
})

describe("todotxt removeTagFromBody", () => {
  it("removes a due tag", () => {
    expect(
      removeTagFromBody("Pay rent due:2025-01-15 rec:1m", "due", "2025-01-15")
    ).toBe("Pay rent rec:1m")
  })

  it("removes a rec tag at the end", () => {
    expect(removeTagFromBody("Pay rent rec:1m", "rec", "1m")).toBe("Pay rent")
  })
})

describe("todotxt removeTokenFromBody", () => {
  it("removes a project token mid-body", () => {
    expect(
      removeTokenFromBody("Plan trip +Travel +Family @home", "+", "Travel")
    ).toBe("Plan trip +Family @home")
  })

  it("removes a context token at the start", () => {
    expect(removeTokenFromBody("@phone Call Mom", "@", "phone")).toBe(
      "Call Mom"
    )
  })

  it("removes a token at the end", () => {
    expect(removeTokenFromBody("Call Mom @phone", "@", "phone")).toBe(
      "Call Mom"
    )
  })

  it("leaves untouched a token-prefix substring inside another word", () => {
    expect(removeTokenFromBody("boss@example.com here", "@", "example")).toBe(
      "boss@example.com here"
    )
  })
})

describe("todotxt parseFile / serializeFile", () => {
  it("round-trips a file with trailing newline", () => {
    const input = `(A) 2024-01-15 First task +work
x 2024-01-20 Second task
Plain task
`
    const parsed = parseFile(input)
    expect(parsed).toHaveLength(3)
    expect(serializeFile(parsed)).toBe(input)
  })

  it("preserves blank lines", () => {
    const input = `Task one

Task two
`
    const parsed = parseFile(input)
    expect(parsed).toHaveLength(3)
    expect(isBlank(parsed[1])).toBe(true)
    expect(serializeFile(parsed)).toBe(input)
  })

  it("handles file with no trailing newline", () => {
    const parsed = parseFile("only line")
    expect(serializeFile(parsed, { trailingNewline: false })).toBe("only line")
  })
})

describe("todotxt toggleCompleted", () => {
  it("marks a task complete with today's date", () => {
    // Construct via local-time fields so the test doesn't depend on the
    // runner's timezone (todayIso uses getFullYear/getMonth/getDate).
    const now = new Date(2024, 2, 15, 12, 0)
    const task = parseLine("(A) 2024-01-15 Call Mom")
    const toggled = toggleCompleted(task, now)
    expect(toggled.completed).toBe(true)
    expect(toggled.completionDate).toBe("2024-03-15")
    expect(serializeTask(toggled)).toBe("x 2024-03-15 (A) 2024-01-15 Call Mom")
  })

  it("uncompletes a task and drops the completion date", () => {
    const task = parseLine("x 2024-01-20 (A) 2024-01-15 Call Mom")
    const toggled = toggleCompleted(task)
    expect(toggled.completed).toBe(false)
    expect(toggled.completionDate).toBeUndefined()
    expect(serializeTask(toggled)).toBe("(A) 2024-01-15 Call Mom")
  })
})

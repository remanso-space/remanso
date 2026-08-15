import { describe, expect, it } from "vitest"

import {
  applyOps,
  findByKey,
  keyId,
  taskKeyOf
} from "@/modules/todo/services/todoOps"
import { parseFile, serializeFile } from "@/utils/todotxt"

const lines = (text: string) => parseFile(text)
const text = (items: ReturnType<typeof lines>) => serializeFile(items)

describe("taskKeyOf", () => {
  it("keys a task by its body", () => {
    const items = lines("(A) call mum\nbuy milk\n")
    expect(taskKeyOf(items, 1)).toEqual({ body: "buy milk", occurrence: 0 })
  })

  it("numbers duplicate bodies by occurrence", () => {
    const items = lines("call mum\n(B) call mum\n")
    expect(taskKeyOf(items, 1)).toEqual({ body: "call mum", occurrence: 1 })
  })

  it("gives duplicate bodies distinct ids", () => {
    const items = lines("call mum\ncall mum\n")
    expect(keyId(taskKeyOf(items, 0))).not.toBe(keyId(taskKeyOf(items, 1)))
  })
})

describe("findByKey", () => {
  it("skips blank lines when counting occurrences", () => {
    const items = lines("call mum\n\ncall mum\n")
    expect(findByKey(items, { body: "call mum", occurrence: 1 })).toBe(2)
  })

  it("returns -1 when the task is gone", () => {
    expect(
      findByKey(lines("buy milk\n"), { body: "call mum", occurrence: 0 })
    ).toBe(-1)
  })
})

describe("applyOps", () => {
  it("applies a set op to the matching task", () => {
    const base = lines("(A) call mum\nbuy milk\n")
    const result = applyOps(base, [
      {
        id: "1",
        type: "set",
        key: { body: "call mum", occurrence: 0 },
        raw: "x 2026-08-15 (A) call mum"
      }
    ])
    expect(text(result)).toBe("x 2026-08-15 (A) call mum\nbuy milk\n")
  })

  it("keeps a task the remote gained since the snapshot", () => {
    const snapshot = lines("call mum\n")
    const base = lines("call mum\nfrom another device\n")
    const result = applyOps(
      base,
      [
        {
          id: "1",
          type: "set",
          key: { body: "call mum", occurrence: 0 },
          raw: "x 2026-08-15 call mum"
        }
      ],
      { snapshot }
    )
    expect(text(result)).toBe("x 2026-08-15 call mum\nfrom another device\n")
  })

  it("drops an op whose task no longer exists on the remote", () => {
    const base = lines("buy milk\n")
    const result = applyOps(base, [
      {
        id: "1",
        type: "set",
        key: { body: "call mum", occurrence: 0 },
        raw: "x 2026-08-15 call mum"
      }
    ])
    expect(text(result)).toBe("buy milk\n")
  })

  it("appends an add op", () => {
    const result = applyOps(lines("buy milk\n"), [
      { id: "1", type: "add", raw: "(A) call mum" }
    ])
    expect(text(result)).toBe("buy milk\n(A) call mum\n")
  })

  it("skips an add the remote already gained since the snapshot", () => {
    const snapshot = lines("buy milk\n")
    const base = lines("buy milk\n(A) call mum\n")
    const result = applyOps(
      base,
      [{ id: "1", type: "add", raw: "(A) call mum" }],
      { snapshot }
    )
    expect(text(result)).toBe("buy milk\n(A) call mum\n")
  })

  it("still adds a duplicate the user asked for twice", () => {
    const snapshot = lines("buy milk\n")
    const base = lines("buy milk\n")
    const result = applyOps(
      base,
      [
        { id: "1", type: "add", raw: "buy milk" },
        { id: "2", type: "add", raw: "buy milk" }
      ],
      { snapshot }
    )
    expect(text(result)).toBe("buy milk\nbuy milk\nbuy milk\n")
  })

  it("deletes the matching task", () => {
    const result = applyOps(lines("call mum\nbuy milk\n"), [
      { id: "1", type: "delete", key: { body: "call mum", occurrence: 0 } }
    ])
    expect(text(result)).toBe("buy milk\n")
  })

  it("targets the right duplicate by occurrence", () => {
    const result = applyOps(lines("call mum\ncall mum\n"), [
      { id: "1", type: "delete", key: { body: "call mum", occurrence: 1 } },
      {
        id: "2",
        type: "set",
        key: { body: "call mum", occurrence: 0 },
        raw: "x call mum"
      }
    ])
    expect(text(result)).toBe("x call mum\n")
  })

  it("chains ops that rename a task then complete it", () => {
    const result = applyOps(lines("call mum\n"), [
      {
        id: "1",
        type: "set",
        key: { body: "call mum", occurrence: 0 },
        raw: "call dad"
      },
      {
        id: "2",
        type: "set",
        key: { body: "call dad", occurrence: 0 },
        raw: "x 2026-08-15 call dad"
      }
    ])
    expect(text(result)).toBe("x 2026-08-15 call dad\n")
  })

  it("leaves the base untouched", () => {
    const base = lines("call mum\n")
    applyOps(base, [
      { id: "1", type: "delete", key: { body: "call mum", occurrence: 0 } }
    ])
    expect(text(base)).toBe("call mum\n")
  })
})

import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"

import { TodoQueue } from "@/modules/todo/models/TodoQueue"
import { parseLine, Task, toggleCompleted } from "@/utils/todotxt"

// Fixed "now" so the completion date a toggle stamps stays assertable.
const NOW = new Date("2026-08-15T09:00:00Z")
const toggle = (task: Task) => toggleCompleted(task, NOW)

const { dataGet, dataUpdate, fetchFile, updateFile } = vi.hoisted(() => ({
  dataGet: vi.fn(),
  dataUpdate: vi.fn(),
  fetchFile: vi.fn(),
  updateFile: vi.fn()
}))

vi.mock("@/data/data", () => ({
  data: { get: dataGet, update: dataUpdate },
  generateId: (type: string, id: string) => `${type}-${id}`
}))

vi.mock("@/hooks/useGitHubContent.hook", () => ({
  useGitHubContent: () => ({ fetchFile, updateFile })
}))

import { TodoEntry, useTodoSync } from "./useTodoSync.hook"

const cached = (
  content: string,
  sha = "cached-sha",
  ops: TodoQueue["ops"] = []
) =>
  dataGet.mockResolvedValue({
    _id: "TodoQueue-alice-notes-todo.txt",
    $type: "TodoQueue",
    user: "alice",
    repo: "notes",
    path: "todo.txt",
    content,
    sha,
    ops
  })

const remote = (content: string, sha = "remote-sha") =>
  fetchFile.mockResolvedValue({ kind: "ok", sha, content })

const setup = async () => {
  const todo = useTodoSync({
    user: "alice",
    repo: "notes",
    path: ref("todo.txt"),
    debounceMs: 0
  })
  await flushPromises()
  return todo
}

const taskNamed = (todo: { entries: { value: TodoEntry[] } }, body: string) => {
  const entry = todo.entries.value.find((e) => e.task.body === body)
  if (!entry) throw new Error(`no task with body "${body}"`)
  return entry
}

beforeEach(() => {
  dataGet.mockReset().mockResolvedValue(null)
  dataUpdate.mockReset().mockResolvedValue(true)
  fetchFile.mockReset().mockResolvedValue({ kind: "offline" })
  updateFile
    .mockReset()
    .mockResolvedValue({ sha: "pushed-sha", conflict: false })
})

describe("useTodoSync", () => {
  it("lists the cached tasks while offline", async () => {
    cached("(A) call mum\nbuy milk\n")

    const todo = await setup()

    expect(todo.entries.value.map((e) => e.task.body)).toEqual([
      "call mum",
      "buy milk"
    ])
    expect(todo.exists.value).toBe(true)
  })

  it("completes a task offline and keeps it pending", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()

    expect(taskNamed(todo, "call mum").task.completed).toBe(true)
    expect(todo.pendingCount.value).toBe(1)
    expect(todo.syncState.value).toBe("offline")
  })

  it("persists the queue so a reload keeps the toggle", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()

    expect(dataUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "TodoQueue-alice-notes-todo.txt",
        content: "call mum\n",
        ops: [
          expect.objectContaining({
            type: "set",
            raw: "x 2026-08-15 call mum"
          })
        ]
      })
    )
  })

  it("replays a pending toggle onto a remote that moved on", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()

    remote("call mum\nfrom another device\n")
    await todo.sync()

    expect(updateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "x 2026-08-15 call mum\nfrom another device\n",
        path: "todo.txt",
        sha: "remote-sha",
        silent: true
      })
    )
    expect(todo.pendingCount.value).toBe(0)
    expect(todo.entries.value.map((e) => e.task.body)).toEqual([
      "call mum",
      "from another device"
    ])
  })

  it("refetches and replays after a conflict instead of dead-ending", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()

    fetchFile
      .mockResolvedValueOnce({
        kind: "ok",
        sha: "sha-1",
        content: "call mum\n"
      })
      .mockResolvedValueOnce({
        kind: "ok",
        sha: "sha-2",
        content: "call mum\nlate arrival\n"
      })
    updateFile
      .mockResolvedValueOnce({ sha: null, conflict: true })
      .mockResolvedValueOnce({ sha: "sha-3", conflict: false })

    await todo.sync()

    expect(updateFile).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: "x 2026-08-15 call mum\nlate arrival\n",
        sha: "sha-2"
      })
    )
    expect(todo.pendingCount.value).toBe(0)
    expect(todo.syncState.value).toBe("idle")
  })

  it("keeps the queue when the push fails", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()

    remote("call mum\n")
    updateFile.mockResolvedValue({ sha: null, conflict: false })
    await todo.sync()

    expect(todo.pendingCount.value).toBe(1)
    expect(taskNamed(todo, "call mum").task.completed).toBe(true)
  })

  it("adopts the remote when nothing is pending", async () => {
    cached("call mum\n")
    const todo = await setup()

    remote("call mum\nadded elsewhere\n")
    await todo.sync()

    expect(todo.entries.value.map((e) => e.task.body)).toEqual([
      "call mum",
      "added elsewhere"
    ])
    expect(updateFile).not.toHaveBeenCalled()
  })

  it("adds and deletes tasks locally before any sync", async () => {
    cached("call mum\n")
    const todo = await setup()

    todo.addTask(parseLine("(B) water plants"))
    await flushPromises()
    todo.deleteTask(taskNamed(todo, "call mum").key)
    await flushPromises()

    expect(todo.entries.value.map((e) => e.task.body)).toEqual(["water plants"])
    expect(todo.pendingCount.value).toBe(2)
  })

  it("collapses repeated edits of the same task into one op", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()
    todo.setTask(entry.key, toggle(taskNamed(todo, "call mum").task))
    await flushPromises()

    expect(todo.pendingCount.value).toBe(1)
    expect(taskNamed(todo, "call mum").task.completed).toBe(false)
  })

  it("retries when the browser comes back online", async () => {
    cached("call mum\n")
    const todo = await setup()

    const entry = taskNamed(todo, "call mum")
    todo.setTask(entry.key, toggle(entry.task))
    await flushPromises()
    expect(todo.pendingCount.value).toBe(1)

    remote("call mum\n")
    window.dispatchEvent(new Event("online"))
    await flushPromises()

    expect(todo.pendingCount.value).toBe(0)
  })

  it("reports a missing file instead of pretending it is empty", async () => {
    fetchFile.mockResolvedValue({ kind: "missing" })

    const todo = await setup()

    expect(todo.exists.value).toBe(false)
  })
})

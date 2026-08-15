import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, ref } from "vue"

import { keyId } from "@/modules/todo/services/todoOps"
import { parseFile } from "@/utils/todotxt"

const { todoSync, storeState, createFile } = vi.hoisted(() => ({
  todoSync: {
    entries: { value: [] as unknown[] },
    exists: { value: true },
    pendingCount: { value: 0 },
    syncState: { value: "idle" },
    setTask: vi.fn(),
    addTask: vi.fn(),
    deleteTask: vi.fn(),
    sync: vi.fn()
  },
  storeState: { files: [] as unknown[], canPush: true },
  createFile: vi.fn()
}))

vi.mock("@/data/data", () => ({
  data: { get: vi.fn(), update: vi.fn() },
  generateId: (type: string, id: string) => `${type}-${id}`
}))

vi.mock("@/hooks/useTodoSync.hook", () => ({
  useTodoSync: () => todoSync
}))

vi.mock("@/hooks/useGitHubContent.hook", () => ({
  useGitHubContent: () => ({ createFile })
}))

vi.mock("@/modules/repo/store/userRepo.store", () => ({
  useUserRepoStore: () => storeState
}))

import TodoNotes from "./TodoNotes.vue"

const entriesFrom = (text: string) => {
  const lines = parseFile(text)
  return lines.map((line, index) => {
    const body = "body" in line ? line.body : ""
    const key = { body, occurrence: 0 }
    return { key, id: `${index}-${keyId(key)}`, task: line }
  })
}

const factory = () =>
  mount(TodoNotes, {
    props: { user: "alice", repo: "notes" },
    global: {
      stubs: {
        FluxNote: { template: "<div><slot /></div>" },
        "flux-note": { template: "<div><slot /></div>" }
      }
    }
  })

beforeEach(() => {
  todoSync.entries = ref([]) as never
  todoSync.exists = ref(true) as never
  todoSync.pendingCount = ref(0) as never
  todoSync.syncState = ref("idle") as never
  todoSync.setTask.mockReset()
  todoSync.addTask.mockReset()
  todoSync.deleteTask.mockReset()
  storeState.files = []
  storeState.canPush = true
})

describe("TodoNotes", () => {
  it("renders the tasks the sync hook projects, remote file entry or not", async () => {
    todoSync.entries = computed(() =>
      entriesFrom("(A) call mum\nbuy milk\n")
    ) as never

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain("call mum")
    expect(wrapper.text()).toContain("buy milk")
    expect(wrapper.text()).not.toContain("Create todo.txt")
  })

  it("offers to create the file only when it exists nowhere", async () => {
    todoSync.exists = ref(false) as never

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain("Create todo.txt")
  })

  it("hands a checkbox toggle to the queue instead of a commit", async () => {
    todoSync.entries = computed(() => entriesFrom("call mum\n")) as never

    const wrapper = factory()
    await flushPromises()
    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(todoSync.setTask).toHaveBeenCalledWith(
      { body: "call mum", occurrence: 0 },
      expect.objectContaining({ completed: true, body: "call mum" })
    )
  })

  it("queues the recurrence of a completed recurring task", async () => {
    todoSync.entries = computed(() =>
      entriesFrom("call mum rec:1d due:2026-08-15\n")
    ) as never

    const wrapper = factory()
    await flushPromises()
    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(todoSync.addTask).toHaveBeenCalledWith(
      expect.objectContaining({ completed: false })
    )
  })

  it("shows what is still waiting to reach GitHub", async () => {
    todoSync.entries = computed(() => entriesFrom("call mum\n")) as never
    todoSync.pendingCount = ref(2) as never
    todoSync.syncState = ref("offline") as never

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find(".todo-sync-state").text()).toContain("2")
  })
})

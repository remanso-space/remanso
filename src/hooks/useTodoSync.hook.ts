import {
  tryOnScopeDispose,
  useDebounceFn,
  useEventListener
} from "@vueuse/core"
import { nanoid } from "nanoid"
import { computed, Ref, ref, toValue, watch } from "vue"

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { TaskKey, TodoOp } from "@/modules/todo/models/TodoOp"
import { TodoQueue } from "@/modules/todo/models/TodoQueue"
import { applyOps, keyId, taskKeyOf } from "@/modules/todo/services/todoOps"
import {
  FileLine,
  isBlank,
  parseFile,
  serializeFile,
  serializeTask,
  Task
} from "@/utils/todotxt"

export type TodoSyncState =
  | "idle"
  | "syncing"
  | "pending"
  | "offline"
  | "conflict"

export interface TodoEntry {
  key: TaskKey
  id: string
  task: Task
}

// A push races the remote only so many times before we stop hammering it and
// wait for the next trigger (a new edit, coming back online, remounting).
const MAX_PUSH_ATTEMPTS = 3

/**
 * Local-first todo.txt.
 *
 * Edits are recorded as intents in a queue persisted to PouchDB, and the list
 * on screen is the last known remote content with that queue replayed on top.
 * Checking a box therefore never waits for the network, survives a reload, and
 * a commit pushed from elsewhere meanwhile is merged rather than refused: the
 * queue is replayed onto whatever the remote holds at push time.
 */
export const useTodoSync = ({
  user,
  repo,
  path,
  debounceMs = 1000
}: {
  user: string
  repo: string
  path: Ref<string | undefined> | string | undefined
  debounceMs?: number
}) => {
  const { fetchFile, updateFile } = useGitHubContent({ user, repo })

  const snapshot = ref({ content: "", sha: "" })
  const ops = ref<TodoOp[]>([])
  const ready = ref(false)
  const exists = ref(false)
  const isSyncing = ref(false)
  const failure = ref<"offline" | "conflict" | null>(null)

  const docId = () =>
    generateId(DataType.TodoQueue, `${user}-${repo}-${toValue(path)}`)

  const items = computed<FileLine[]>(() => {
    const base = parseFile(snapshot.value.content)
    return applyOps(base, ops.value, { snapshot: base })
  })

  const entries = computed<TodoEntry[]>(() =>
    items.value.flatMap((line, index) => {
      if (isBlank(line)) return []
      const key = taskKeyOf(items.value, index)
      return [{ key, id: keyId(key), task: line }]
    })
  )

  const pendingCount = computed(() => ops.value.length)

  const syncState = computed<TodoSyncState>(() => {
    if (isSyncing.value) return "syncing"
    if (!ops.value.length) return "idle"
    if (failure.value) return failure.value
    return "pending"
  })

  const persist = async () => {
    const pathValue = toValue(path)
    if (!pathValue) return
    await data.update<DataType.TodoQueue, TodoQueue>({
      _id: docId(),
      $type: DataType.TodoQueue,
      user,
      repo,
      path: pathValue,
      content: snapshot.value.content,
      sha: snapshot.value.sha,
      ops: ops.value.map((op) => ({ ...op }))
    })
  }

  const load = async () => {
    ready.value = false
    const doc = await data.get<DataType.TodoQueue, TodoQueue>(docId())
    if (doc) {
      snapshot.value = { content: doc.content, sha: doc.sha }
      ops.value = doc.ops ?? []
      exists.value = true
    } else {
      snapshot.value = { content: "", sha: "" }
      ops.value = []
      exists.value = false
    }
    ready.value = true
  }

  const runSync = async () => {
    const pathValue = toValue(path)
    if (!pathValue) return

    isSyncing.value = true
    try {
      for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt++) {
        const remote = await fetchFile(pathValue)

        if (remote.kind === "offline") {
          failure.value = "offline"
          return
        }
        if (remote.kind === "missing") {
          // Nothing to merge into: the file has to be created first.
          exists.value = ops.value.length > 0 || exists.value
          failure.value = null
          return
        }

        exists.value = true
        failure.value = null

        const batch = ops.value.map((op) => ({ ...op }))
        if (!batch.length) {
          snapshot.value = { content: remote.content, sha: remote.sha }
          await persist()
          return
        }

        const merged = serializeFile(
          applyOps(parseFile(remote.content), batch, {
            snapshot: parseFile(snapshot.value.content)
          })
        )

        if (merged === remote.content) {
          // The remote already holds everything we owe it (a push whose
          // response we lost, or an edit someone else made identically).
          snapshot.value = { content: remote.content, sha: remote.sha }
          dropOps(batch)
          await persist()
          return
        }

        const { sha, conflict } = await updateFile({
          content: merged,
          path: pathValue,
          sha: remote.sha,
          silent: true
        })

        if (sha) {
          snapshot.value = { content: merged, sha }
          dropOps(batch)
          await persist()
          return
        }

        if (!conflict) {
          failure.value = "offline"
          return
        }
        // Conflict: the remote moved between our fetch and our push. Fetch it
        // again and replay onto the newer content.
      }

      failure.value = "conflict"
    } finally {
      isSyncing.value = false
    }
  }

  const dropOps = (batch: TodoOp[]) => {
    const pushed = new Set(batch.map((op) => op.id))
    ops.value = ops.value.filter((op) => !pushed.has(op.id))
  }

  // Serialised so an explicit sync never overlaps a scheduled one, and so
  // awaiting a sync means every sync asked for before it has finished.
  let chain: Promise<void> = Promise.resolve()
  const sync = (): Promise<void> => {
    chain = chain.then(runSync).catch((error) => {
      console.warn("todo sync failed", error)
      isSyncing.value = false
    })
    return chain
  }

  const debouncedSync = useDebounceFn(sync, debounceMs)

  const pushOp = (op: TodoOp) => {
    const last = ops.value[ops.value.length - 1]
    // Toggling the same task back and forth would otherwise pile up ops that
    // all say the same thing once replayed.
    const collapses =
      op.type === "set" &&
      last?.type === "set" &&
      last.key.body === op.key.body &&
      last.key.occurrence === op.key.occurrence

    ops.value = collapses ? [...ops.value.slice(0, -1), op] : [...ops.value, op]

    persist()
    debouncedSync()
  }

  const setTask = (key: TaskKey, task: Task) =>
    pushOp({ id: nanoid(), type: "set", key, raw: serializeTask(task) })

  const addTask = (task: Task) =>
    pushOp({ id: nanoid(), type: "add", raw: serializeTask(task) })

  const deleteTask = (key: TaskKey) =>
    pushOp({ id: nanoid(), type: "delete", key })

  watch(
    () => toValue(path),
    async (pathValue) => {
      if (!pathValue) return
      await load()
      await sync()
    },
    { immediate: true }
  )

  // Coming back online is the moment a queue built offline can finally land.
  useEventListener(window, "online", () => {
    sync()
  })

  // Leaving the view before the debounce elapsed must not park the change
  // until the next visit — the queue is safe on disk either way, but there is
  // no reason to sit on it.
  tryOnScopeDispose(() => {
    if (ops.value.length) sync()
  })

  return {
    entries,
    items,
    ready,
    exists,
    pendingCount,
    syncState,
    setTask,
    addTask,
    deleteTask,
    sync
  }
}

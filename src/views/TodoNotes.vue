<script setup lang="ts">
import { computed, defineAsyncComponent, Ref, ref, watch } from "vue"

import TodoTxtItem from "@/components/TodoTxtItem.vue"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { useTodoTxtCommit } from "@/hooks/useTodoTxtCommit.hook"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"
import { errorMessage } from "@/utils/notif"
import {
  applyRecurrence,
  contextsOf,
  FileLine,
  isBlank,
  parseLine,
  projectsOf,
  Task
} from "@/utils/todotxt"

type Prop = {
  user: string
  repo: string
}

const TODO_PATH = "todo.txt"

const FluxNote = defineAsyncComponent(() => import("@/components/FluxNote.vue"))

const props = defineProps<Prop>()
const store = useUserRepoStore()

const todoFile = computed(() => store.files.find((f) => f.path === TODO_PATH))
const sha = computed(() => todoFile.value?.sha ?? "")
const canPush = computed(() => store.canPush)

const path = computed(() =>
  todoFile.value?.path ? todoFile.value.path : TODO_PATH
)

const { items, syncContent, mutate, hasPendingChanges } = useTodoTxtCommit({
  user: props.user,
  repo: props.repo,
  path,
  initialContent: "",
  initialSha: sha,
  debounceMs: 1000
})

watch(
  sha,
  async (newSha) => {
    if (!newSha || hasPendingChanges.value) return
    const base64 = await queryFileContent(props.user, props.repo, newSha)
    if (base64) {
      syncContent(decodeBase64ToUTF8(base64), newSha)
    }
  },
  { immediate: true }
)

// Rank `A` = 65 .. `Z` = 90; absent priority is Infinity so it sorts last
// regardless of locale collation quirks.
const priorityRank = (p?: string): number =>
  p ? p.charCodeAt(0) : Number.POSITIVE_INFINITY

const taskEntries = computed(() => {
  const out: { line: Task; index: number }[] = []
  items.value.forEach((line, index) => {
    if (!isBlank(line)) out.push({ line, index })
  })
  // Stable sort: equal priorities preserve file order.
  out.sort(
    (a, b) => priorityRank(a.line.priority) - priorityRank(b.line.priority)
  )
  return out
})

const allProjects = computed(() => {
  const set = new Set<string>()
  items.value.forEach((line) => {
    if (!isBlank(line)) projectsOf(line).forEach((p) => set.add(p))
  })
  return Array.from(set).sort()
})

const allContexts = computed(() => {
  const set = new Set<string>()
  items.value.forEach((line) => {
    if (!isBlank(line)) contextsOf(line).forEach((c) => set.add(c))
  })
  return Array.from(set).sort()
})

// "none" represents tasks without a priority.
const allPriorities = computed<Array<string | "none">>(() => {
  const set = new Set<string | "none">()
  items.value.forEach((line) => {
    if (isBlank(line)) return
    set.add(line.priority ?? "none")
  })
  return Array.from(set).sort((a, b) => {
    if (a === "none") return 1
    if (b === "none") return -1
    return a.localeCompare(b)
  })
})

const activeProjects = ref<Set<string>>(new Set())
const activeContexts = ref<Set<string>>(new Set())
const activePriorities = ref<Set<string | "none">>(new Set())

// XOR: either "open" only, "done" only, or "all" (no status filter).
type StatusFilter = "all" | "open" | "done"
const statusFilter = ref<StatusFilter>("open")
const setStatusFilter = (next: Exclude<StatusFilter, "all">) => {
  statusFilter.value = statusFilter.value === next ? "all" : next
}

// Drop entries from `active` that no longer appear in `available`. Without
// this, editing tasks until a selected project/context/priority disappears
// leaves the filter "stuck on" — hasFilters stays true with no visible chip
// to toggle off.
const pruneActive = <T>(active: Ref<Set<T>>, available: ReadonlyArray<T>) => {
  const valid = new Set(available)
  const pruned = new Set<T>()
  active.value.forEach((v) => {
    if (valid.has(v)) pruned.add(v)
  })
  if (pruned.size !== active.value.size) active.value = pruned
}

watch(allProjects, (next) => pruneActive(activeProjects, next))
watch(allContexts, (next) => pruneActive(activeContexts, next))
watch(allPriorities, (next) => pruneActive(activePriorities, next))

const toggleProject = (p: string) => {
  const next = new Set(activeProjects.value)
  if (next.has(p)) next.delete(p)
  else next.add(p)
  activeProjects.value = next
}

const toggleContext = (c: string) => {
  const next = new Set(activeContexts.value)
  if (next.has(c)) next.delete(c)
  else next.add(c)
  activeContexts.value = next
}

const togglePriority = (p: string | "none") => {
  const next = new Set(activePriorities.value)
  if (next.has(p)) next.delete(p)
  else next.add(p)
  activePriorities.value = next
}

const clearFilters = () => {
  activeProjects.value = new Set()
  activeContexts.value = new Set()
  activePriorities.value = new Set()
  statusFilter.value = "all"
}

const hasFilters = computed(
  () =>
    activeProjects.value.size > 0 ||
    activeContexts.value.size > 0 ||
    activePriorities.value.size > 0 ||
    statusFilter.value !== "all"
)

const priorityBadgeFilterClass = (p: string | "none"): string => {
  switch (p) {
    case "A":
      return "badge-error"
    case "B":
      return "badge-warning"
    case "C":
      return "badge-info"
    default:
      return "badge-ghost"
  }
}

const filteredEntries = computed(() => {
  if (!hasFilters.value) return taskEntries.value
  return taskEntries.value.filter(({ line }) => {
    const taskProjects = projectsOf(line)
    const taskContexts = contextsOf(line)
    const projectsOk =
      activeProjects.value.size === 0 ||
      taskProjects.some((p) => activeProjects.value.has(p))
    const contextsOk =
      activeContexts.value.size === 0 ||
      taskContexts.some((c) => activeContexts.value.has(c))
    const prioritiesOk =
      activePriorities.value.size === 0 ||
      activePriorities.value.has(line.priority ?? "none")
    const statusOk =
      statusFilter.value === "all" ||
      (statusFilter.value === "done" ? line.completed : !line.completed)
    return projectsOk && contextsOk && prioritiesOk && statusOk
  })
})

const updateTask = (index: number, next: Task) => {
  mutate((current) => {
    const prev = current[index]
    const updated = current.map((line, i) => (i === index ? next : line))
    if (!isBlank(prev) && !prev.completed && next.completed) {
      const recurring = applyRecurrence(next)
      if (recurring) return [...updated, recurring]
    }
    return updated
  })
}

const deleteTask = (index: number) => {
  mutate((current) => current.filter((_, i) => i !== index))
}

const newTaskInput = ref("")

const addTask = () => {
  const text = newTaskInput.value.trim()
  if (!text) return
  const task = parseLine(text)
  newTaskInput.value = ""
  mutate((current) => {
    const next: FileLine[] = [...current, task]
    return next
  })
}

const { createFile } = useGitHubContent({ user: props.user, repo: props.repo })
const isCreating = ref(false)

// Pin a leaving row's box to its current coordinates before Vue makes it
// position: absolute. Without this, browsers (notably Firefox) compute the
// static position of an absolutely-positioned former-flex child to (0,0),
// so multiple leaving rows stack on top of each other and the remaining
// rows snap into place once the DOM nodes are removed.
const lockLeavingPosition = (el: Element) => {
  const li = el as HTMLElement
  const parent = li.parentElement
  if (!parent) return
  const liRect = li.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  li.style.top = `${liRect.top - parentRect.top}px`
  li.style.left = `${liRect.left - parentRect.left}px`
  li.style.width = `${liRect.width}px`
}

const createTodoFile = async () => {
  if (isCreating.value) return
  isCreating.value = true
  const { sha: newSha, conflict } = await createFile({
    content: "",
    path: TODO_PATH
  })
  isCreating.value = false

  if (conflict) return
  if (!newSha) {
    errorMessage("Could not create todo.txt")
    return
  }

  store.registerUploadedFile({
    path: TODO_PATH,
    sha: newSha,
    type: "blob"
  })
}
</script>

<template>
  <div class="todo-notes">
    <flux-note
      key="todo-notes"
      :user="user"
      :repo="repo"
      content=""
      :parse-content="false"
      :with-content="false"
    >
      <h3 class="subtitle">Todo</h3>

      <div v-if="!todoFile" class="card bg-base-200">
        <div class="card-body items-center text-center">
          <p>No <code>todo.txt</code> in this repo yet.</p>
          <div v-if="canPush" class="card-actions">
            <button
              class="btn btn-primary"
              :disabled="isCreating"
              @click="createTodoFile"
            >
              Create todo.txt
            </button>
          </div>
          <p v-else class="text-sm opacity-70">
            Sign in to a repo you can push to.
          </p>
        </div>
      </div>

      <template v-else>
        <form v-if="canPush" class="mb-4 join w-full" @submit.prevent="addTask">
          <input
            v-model="newTaskInput"
            type="text"
            class="input input-bordered input-sm join-item flex-1"
            placeholder="(A) task +project @context…"
          />
          <button
            type="submit"
            class="btn btn-sm btn-primary join-item"
            :disabled="!newTaskInput.trim()"
          >
            Add
          </button>
        </form>

        <div
          v-if="
            allProjects.length || allContexts.length || allPriorities.length
          "
          class="todo-filters"
        >
          <div class="todo-filter-columns">
            <section class="todo-filter-column">
              <h4 class="todo-filter-label">Status</h4>
              <div class="todo-filter-chips">
                <button
                  type="button"
                  class="todo-filter-chip badge badge-success"
                  :class="{ 'badge-soft': statusFilter !== 'open' }"
                  @click="setStatusFilter('open')"
                >
                  Open
                </button>
                <button
                  type="button"
                  class="todo-filter-chip badge badge-neutral"
                  :class="{ 'badge-soft': statusFilter !== 'done' }"
                  @click="setStatusFilter('done')"
                >
                  Done
                </button>
              </div>
            </section>
            <section v-if="allPriorities.length" class="todo-filter-column">
              <h4 class="todo-filter-label">Priorities</h4>
              <div class="todo-filter-chips">
                <button
                  v-for="p in allPriorities"
                  :key="`pri:${p}`"
                  type="button"
                  class="todo-filter-chip badge"
                  :class="[
                    priorityBadgeFilterClass(p),
                    { 'badge-soft': !activePriorities.has(p) }
                  ]"
                  @click="togglePriority(p)"
                >
                  {{ p === "none" ? "—" : `(${p})` }}
                </button>
              </div>
            </section>
            <section v-if="allProjects.length" class="todo-filter-column">
              <h4 class="todo-filter-label">Projects</h4>
              <div class="todo-filter-chips">
                <button
                  v-for="p in allProjects"
                  :key="`p:${p}`"
                  type="button"
                  class="todo-filter-chip badge badge-primary"
                  :class="{ 'badge-soft': !activeProjects.has(p) }"
                  @click="toggleProject(p)"
                >
                  +{{ p }}
                </button>
              </div>
            </section>
            <section v-if="allContexts.length" class="todo-filter-column">
              <h4 class="todo-filter-label">Contexts</h4>
              <div class="todo-filter-chips">
                <button
                  v-for="c in allContexts"
                  :key="`c:${c}`"
                  type="button"
                  class="todo-filter-chip badge badge-secondary"
                  :class="{ 'badge-soft': !activeContexts.has(c) }"
                  @click="toggleContext(c)"
                >
                  @{{ c }}
                </button>
              </div>
            </section>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm self-start"
            :class="{ invisible: !hasFilters }"
            :aria-hidden="!hasFilters"
            :tabindex="hasFilters ? 0 : -1"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>

        <TransitionGroup
          name="todo"
          tag="ul"
          class="todo-list"
          @before-leave="lockLeavingPosition"
        >
          <li v-for="entry in filteredEntries" :key="entry.index">
            <todo-txt-item
              :task="entry.line"
              :can-edit="canPush"
              @update="(t) => updateTask(entry.index, t)"
              @delete="deleteTask(entry.index)"
            />
          </li>
        </TransitionGroup>

        <p
          v-if="filteredEntries.length === 0 && hasFilters"
          class="text-sm opacity-60 mt-3"
        >
          No tasks match the current filters.
        </p>

        <p
          v-if="taskEntries.length === 0 && canPush"
          class="text-sm opacity-60 mt-3"
        >
          Your todo list is empty. Add a task above.
        </p>
      </template>
    </flux-note>
  </div>
</template>

<style scoped lang="scss">
.todo-notes {
  display: flex;
  flex: 1;

  .subtitle {
    text-align: center;
  }

  .todo-list {
    list-style: none;
    padding-left: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    // No `gap` — gap can't transition, so it would snap closed when a row
    // is removed at the end of the leave animation. Spacing lives on
    // .todo-li-inner instead so it collapses with the row.

    li {
      list-style: none;
      // Use grid-template-rows 1fr → 0fr so the row's height collapses
      // smoothly during leave instead of snapping when the DOM is removed.
      display: grid;
      grid-template-rows: 1fr;
    }
  }

  .todo-li-inner {
    overflow: hidden;
    min-height: 0;
    padding-bottom: 0.25rem;
  }

  .todo-enter-active,
  .todo-leave-active {
    transition:
      opacity 180ms ease,
      transform 220ms ease,
      grid-template-rows 220ms ease;
  }

  .todo-enter-from,
  .todo-leave-to {
    opacity: 0;
    transform: translateX(-12px);
    grid-template-rows: 0fr;
  }

  .todo-move {
    transition: transform 220ms ease;
  }

  .todo-filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .todo-filter-columns {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .todo-filter-column {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }

  .todo-filter-label {
    font-size: 0.8rem;
    opacity: 0.7;
    margin: 0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 0 0 auto;
    min-width: 5.5rem;
  }

  .todo-filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    flex: 1 1 auto;
  }

  .todo-filter-chip {
    cursor: pointer;
  }
}
</style>

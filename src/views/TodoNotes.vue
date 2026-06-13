<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue"

import TodoTxtItem from "@/components/TodoTxtItem.vue"
import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { useTodoTxtCommit } from "@/hooks/useTodoTxtCommit.hook"
import { queryFileContent } from "@/modules/repo/services/repo"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"
import { errorMessage } from "@/utils/notif"
import {
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
  out.sort((a, b) => priorityRank(a.line.priority) - priorityRank(b.line.priority))
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

const activeProjects = ref<Set<string>>(new Set())
const activeContexts = ref<Set<string>>(new Set())

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

const clearFilters = () => {
  activeProjects.value = new Set()
  activeContexts.value = new Set()
}

const hasFilters = computed(
  () => activeProjects.value.size > 0 || activeContexts.value.size > 0
)

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
    return projectsOk && contextsOk
  })
})

const updateTask = (index: number, next: Task) => {
  mutate((current) => current.map((line, i) => (i === index ? next : line)))
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
        <form
          v-if="canPush"
          class="mb-4 join w-full"
          @submit.prevent="addTask"
        >
          <input
            v-model="newTaskInput"
            type="text"
            class="input input-bordered input-sm join-item flex-1"
            placeholder="Add a task ((A) priority +project @context)…"
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
          v-if="allProjects.length || allContexts.length"
          class="todo-filters"
        >
          <div class="todo-filter-columns">
            <section
              v-if="allProjects.length"
              class="todo-filter-column"
            >
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
            <section
              v-if="allContexts.length"
              class="todo-filter-column"
            >
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
            class="btn btn-ghost btn-xs w-fit self-start"
            :class="{ invisible: !hasFilters }"
            :aria-hidden="!hasFilters"
            :tabindex="hasFilters ? 0 : -1"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>

        <TransitionGroup name="todo" tag="ul" class="todo-list">
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
    gap: 0.25rem;
    position: relative;

    li {
      list-style: none;
    }
  }

  .todo-enter-active,
  .todo-leave-active {
    transition:
      opacity 180ms ease,
      transform 220ms ease;
  }

  .todo-enter-from {
    opacity: 0;
    transform: translateX(-12px);
  }

  .todo-leave-to {
    opacity: 0;
    transform: translateX(12px);
  }

  // Take the leaving item out of layout flow so the rest of the list
  // slides up smoothly via .todo-move instead of jumping.
  .todo-leave-active {
    position: absolute;
    width: 100%;
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .todo-filter-column {
    min-width: 0;
    text-align: center;
  }

  .todo-filter-label {
    font-size: 0.8rem;
    opacity: 0.7;
    margin: 0 0 0.35rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: center;
  }

  .todo-filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: center;
  }

  .todo-filter-chip {
    cursor: pointer;
  }

  @media (max-width: 480px) {
    .todo-filter-columns {
      grid-template-columns: 1fr;
    }
  }
}
</style>

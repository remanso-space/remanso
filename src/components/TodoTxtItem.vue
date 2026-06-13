<script setup lang="ts">
import { onClickOutside } from "@vueuse/core"
import { computed, nextTick, ref, useTemplateRef, watch } from "vue"

import {
  removeTagFromBody,
  removeTokenFromBody,
  segmentBody,
  Task,
  toggleCompleted
} from "@/utils/todotxt"

const props = defineProps<{
  task: Task
  canEdit: boolean
}>()

const emit = defineEmits<{
  update: [task: Task]
  delete: []
}>()

const segments = computed(() => segmentBody(props.task.body))

const PRIORITIES = ["A", "B", "C", "D"] as const

const priorityBadgeClassFor = (priority?: string): string => {
  switch (priority) {
    case "A":
      return "badge badge-soft badge-error"
    case "B":
      return "badge badge-soft badge-warning"
    case "C":
      return "badge badge-soft badge-info"
    default:
      return "badge badge-soft badge-ghost"
  }
}

const priorityBadgeClass = computed(() =>
  priorityBadgeClassFor(props.task.priority)
)

const toggle = () => {
  if (!props.canEdit) return
  emit("update", toggleCompleted(props.task))
}

const priorityOpen = ref(false)
const priorityDropdown = useTemplateRef<HTMLDivElement>("priorityDropdown")
onClickOutside(priorityDropdown, () => {
  priorityOpen.value = false
})

const togglePriorityMenu = () => {
  if (!props.canEdit) return
  priorityOpen.value = !priorityOpen.value
}

const setPriority = (priority: string | undefined) => {
  if (!props.canEdit) return
  emit("update", { ...props.task, priority })
  priorityOpen.value = false
}

const removeToken = (kind: "project" | "context", value: string) => {
  if (!props.canEdit) return
  const newBody = removeTokenFromBody(
    props.task.body,
    kind === "project" ? "+" : "@",
    value
  )
  emit("update", { ...props.task, body: newBody })
}

const removeTag = (key: "due" | "rec", value: string) => {
  if (!props.canEdit) return
  const newBody = removeTagFromBody(props.task.body, key, value)
  emit("update", { ...props.task, body: newBody })
}

const startOfToday = (): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const parseDueDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const dueClass = (value: string): string => {
  const due = parseDueDate(value)
  if (!due) return "badge badge-soft badge-accent"
  const today = startOfToday().getTime()
  if (due.getTime() < today) return "badge badge-soft badge-error"
  if (due.getTime() === today) return "badge badge-soft badge-warning"
  return "badge badge-soft badge-accent"
}

const MS_PER_DAY = 86_400_000

const formatDueDate = (value: string): string => {
  const due = parseDueDate(value)
  if (!due) return value
  const diff = Math.round((due.getTime() - startOfToday().getTime()) / MS_PER_DAY)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return due.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  })
}

const dueTitle = (value: string): string => {
  const due = parseDueDate(value)
  if (!due) return `Due ${value}`
  return `Due ${due.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })}`
}

const REC_UNITS: Record<string, [string, string]> = {
  d: ["day", "days"],
  w: ["week", "weeks"],
  m: ["month", "months"],
  y: ["year", "years"]
}
const REC_ADVERBS: Record<string, string> = {
  d: "Daily",
  w: "Weekly",
  m: "Monthly",
  y: "Yearly"
}

const formatRecurrence = (value: string): string => {
  const m = value.match(/^\+?(\d+)([dwmyDWMY])$/)
  if (!m) return value
  const n = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()
  if (n === 1) return REC_ADVERBS[unit] ?? value
  const [, plural] = REC_UNITS[unit]
  return `Every ${n} ${plural}`
}

const recTitle = (value: string): string => {
  const isStrict = value.startsWith("+")
  const formatted = formatRecurrence(value)
  return isStrict
    ? `${formatted} (from due date)`
    : `${formatted} (from completion)`
}

const editing = ref(false)
const bodyDraft = ref("")
const inputRef = useTemplateRef<HTMLInputElement>("bodyInput")

const startEdit = () => {
  if (!props.canEdit || props.task.completed) return
  bodyDraft.value = props.task.body
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

const commitEdit = () => {
  if (!editing.value) return
  const next = bodyDraft.value.trim()
  editing.value = false
  if (next !== props.task.body) {
    emit("update", { ...props.task, body: next })
  }
}

const cancelEdit = () => {
  editing.value = false
}

watch(
  () => props.task.body,
  () => {
    if (editing.value) editing.value = false
  }
)
</script>

<template>
  <div
    class="todo-row group flex items-start gap-2 py-1 px-2 rounded hover:bg-base-200"
    :class="{ 'opacity-60': task.completed }"
  >
    <input
      type="checkbox"
      class="checkbox checkbox-success checkbox-sm mt-1"
      :checked="task.completed"
      :disabled="!canEdit"
      @change="toggle"
    />

    <div
      ref="priorityDropdown"
      class="todo-priority"
      :class="{ 'todo-priority--open': priorityOpen }"
    >
      <button
        type="button"
        :class="priorityBadgeClass"
        class="todo-priority-trigger cursor-pointer w-7 justify-center mt-0.5"
        :disabled="!canEdit"
        @click="togglePriorityMenu"
      >
        {{ task.priority ?? "—" }}
      </button>
      <div
        v-if="canEdit && priorityOpen"
        class="todo-priority-menu bg-base-200 rounded-box shadow p-2"
      >
        <button
          v-for="p in PRIORITIES"
          :key="p"
          type="button"
          :class="priorityBadgeClassFor(p)"
          class="todo-priority-option w-10 justify-center cursor-pointer"
          @click="setPriority(p)"
        >
          ({{ p }})
        </button>
        <button
          type="button"
          :class="priorityBadgeClassFor(undefined)"
          class="todo-priority-option w-10 justify-center cursor-pointer"
          @click="setPriority(undefined)"
        >
          —
        </button>
      </div>
    </div>

    <div class="flex-1 min-w-0">
      <input
        v-if="editing"
        ref="bodyInput"
        v-model="bodyDraft"
        type="text"
        class="input input-ghost input-sm w-full"
        @blur="commitEdit"
        @keydown.enter.prevent="commitEdit"
        @keydown.escape.prevent="cancelEdit"
      />
      <div
        v-else
        class="body-display cursor-text"
        :class="{ 'line-through': task.completed }"
        @click="startEdit"
      >
        <template v-for="(seg, i) in segments" :key="i">
          <span v-if="seg.kind === 'text'">{{ seg.value }}</span>
          <span
            v-else-if="seg.kind === 'project'"
            class="todo-chip badge badge-soft badge-primary mx-0.5"
            @click.stop
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon icon-tabler icon-tabler-plus"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 5l0 14" />
              <path d="M5 12l14 0" />
            </svg>
            {{ seg.value }}
            <button
              v-if="canEdit"
              class="todo-chip-close"
              type="button"
              :aria-label="`Remove project ${seg.value}`"
              @click.stop="removeToken('project', seg.value)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-x"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span
            v-else-if="seg.kind === 'context'"
            class="todo-chip badge badge-soft badge-secondary mx-0.5"
            @click.stop
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon icon-tabler icon-tabler-at"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path
                d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"
              />
              <path
                d="M16 12v1.5a2.5 2.5 0 0 0 5 0v-1.5a9 9 0 1 0 -5.5 8.28"
              />
            </svg>
            {{ seg.value }}
            <button
              v-if="canEdit"
              class="todo-chip-close"
              type="button"
              :aria-label="`Remove context ${seg.value}`"
              @click.stop="removeToken('context', seg.value)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-x"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span
            v-else-if="seg.kind === 'due'"
            :class="dueClass(seg.value) + ' mx-0.5 todo-chip'"
            :title="dueTitle(seg.value)"
            @click.stop
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon icon-tabler icon-tabler-calendar"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path
                d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
              />
              <path d="M16 3v4" />
              <path d="M8 3v4" />
              <path d="M4 11h16" />
            </svg>
            {{ formatDueDate(seg.value) }}
            <button
              v-if="canEdit"
              class="todo-chip-close"
              type="button"
              :aria-label="`Remove due date ${seg.value}`"
              @click.stop="removeTag('due', seg.value)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-x"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span
            v-else
            class="todo-chip badge badge-soft badge-info mx-0.5"
            :title="recTitle(seg.value)"
            @click.stop
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon icon-tabler icon-tabler-repeat"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              stroke-width="1.75"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3" />
              <path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3" />
            </svg>
            {{ formatRecurrence(seg.value) }}
            <button
              v-if="canEdit"
              class="todo-chip-close"
              type="button"
              :aria-label="`Remove recurrence ${seg.value}`"
              @click.stop="removeTag('rec', seg.value)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-x"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </span>
        </template>
        <span v-if="task.body.length === 0" class="opacity-50 italic">
          (empty task)
        </span>
      </div>
    </div>

    <button
      v-if="canEdit"
      type="button"
      class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition"
      aria-label="Delete task"
      @click="emit('delete')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-trash"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        stroke-width="1.75"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
        <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
      </svg>
    </button>
  </div>
</template>

<style scoped lang="scss">
.body-display {
  word-break: break-word;
}

.todo-priority {
  position: relative;
  display: inline-flex;
}

// Lift the whole priority widget above sibling rows while its menu is open,
// otherwise the absolutely-positioned menu paints behind row N+1's content.
// 1 is enough: no other element in this view sets a non-auto z-index.
.todo-priority--open {
  z-index: 1;
}

.todo-priority-trigger {
  border: 0;
}

.todo-priority-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: auto;
}

.todo-priority-option {
  border: 0;
  font: inherit;
  transition:
    transform 120ms ease,
    filter 120ms ease;

  &:hover {
    filter: brightness(1.1);
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
}

.todo-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  vertical-align: baseline;
}

.todo-chip-close {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin-left: 0.1rem;
  padding: 0;
  background: transparent;
  border: 0;
  color: inherit;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}
</style>

<script setup lang="ts">
import { computed, ref } from "vue"

const props = defineProps<{ args: string; name: string }>()

const parseArgs = (args: string): { black: number; total: number } | null => {
  const trimmed = args.trim()
  if (!trimmed) return { black: 1, total: 20 }
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(trimmed)
  if (!match) return null
  const black = Number(match[1])
  const total = Number(match[2])
  if (black < 1 || black >= total || total > 100) return null
  return { black, total }
}

const urn = parseArgs(props.args)

const draws = ref(0)
const blackDraws = ref(0)
const lastResult = ref<"black" | "white" | null>(null)
const highlighted = ref<number | null>(null)

const theoretical = computed(() =>
  urn ? Math.round((urn.black / urn.total) * 100) : 0
)
const empirical = computed(() =>
  draws.value > 0 ? Math.round((blackDraws.value / draws.value) * 100) : 0
)

const draw = () => {
  if (!urn) return
  const isBlack = Math.random() < urn.black / urn.total
  highlighted.value = Math.floor(Math.random() * urn.total)
  lastResult.value = isBlack ? "black" : "white"
  draws.value += 1
  if (isBlack) blackDraws.value += 1
}

const reset = () => {
  draws.value = 0
  blackDraws.value = 0
  lastResult.value = null
  highlighted.value = null
}
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-fit rounded-box border border-base-300 bg-base-100 p-3"
  >
    <template v-if="urn">
      <p class="text-sm">P(black) = {{ theoretical }}%</p>
      <div class="mt-2 flex max-w-56 flex-wrap gap-1">
        <div
          v-for="index in urn.total"
          :key="index"
          class="h-3.5 w-3.5 rounded-full border border-base-300"
          :class="
            highlighted === index - 1
              ? lastResult === 'white'
                ? 'bg-base-100 ring-2 ring-base-content/40'
                : ''
              : 'bg-base-200'
          "
          :style="
            highlighted === index - 1 && lastResult === 'black'
              ? { background: 'var(--link-accent)' }
              : undefined
          "
        />
      </div>
      <div class="mt-2 flex items-center gap-2">
        <button class="btn btn-primary btn-sm" @click="draw">Draw</button>
        <button
          class="btn btn-ghost btn-sm text-(--link-accent)"
          title="Reset"
          aria-label="Reset"
          @click="reset"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
          </svg>
        </button>
        <span v-if="lastResult" class="text-sm">
          {{ lastResult === "black" ? "Black!" : "White" }}
        </span>
      </div>
      <p v-if="draws > 0" class="mt-1 text-xs opacity-60">
        draws: {{ draws }} · black: {{ blackDraws }} ({{ empirical }}%)
      </p>
    </template>
    <p v-else class="text-xs opacity-60">expected :::{{ name }} 1/20:::</p>
  </div>
</template>

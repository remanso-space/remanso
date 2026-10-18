<script setup lang="ts">
import { computed, ref } from "vue"

import { shuffle } from "../shuffle"
import { consumeRows, type InstrumentProps } from "../sibling"
import InstrumentButton from "./controls/InstrumentButton.vue"
import ResetIcon from "./controls/ResetIcon.vue"

interface Card {
  question: string
  answer: string
}

const props = defineProps<InstrumentProps>()

const table = consumeRows(props.sibling)

const swapped = /\bswap\b/.test(props.args)

const toCard = (cells: string[]): Card => {
  const front = cells[0] ?? ""
  const back = cells.slice(1).join(" — ")
  return swapped
    ? { question: back, answer: front }
    : { question: front, answer: back }
}

const cards = (table?.rows ?? []).map(toCard)
const hasCards = cards.length > 0

// :::flashcard::: (singular) = one reveal card: first row only, no deck
// mechanics (shuffle, progress, next).
const single = props.name === "flashcard"

const deck = ref<Card[]>(single ? cards.slice(0, 1) : shuffle(cards))
const index = ref(0)
const revealed = ref(false)

const current = computed(() => deck.value[index.value])
const isDone = computed(() => index.value >= deck.value.length)
const progress = computed(
  () => `${Math.min(index.value + 1, deck.value.length)} / ${deck.value.length}`
)

const directionHint = computed(() => {
  const header = table?.header ?? []
  if (header.length < 2) return ""
  const front = header[0]
  const back = header.slice(1).join(" — ")
  return swapped ? `${back} → ${front}` : `${front} → ${back}`
})

const reveal = () => {
  revealed.value = true
}

const next = () => {
  index.value++
  revealed.value = false
}

const restart = () => {
  deck.value = shuffle(cards)
  index.value = 0
  revealed.value = false
}
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <p v-if="!hasCards" class="text-center text-sm opacity-60">
      Add a markdown table right below :::{{ name }}:::
    </p>
    <template v-else>
      <div v-if="!single" class="flex items-center justify-between gap-2">
        <span class="flashcard-hint text-xs opacity-60">
          {{ directionHint }}
        </span>
        <div class="flex items-center gap-1">
          <span class="flashcard-progress text-xs tabular-nums opacity-60">
            {{ progress }}
          </span>
          <InstrumentButton label="Restart" @click="restart">
            <ResetIcon />
          </InstrumentButton>
        </div>
      </div>
      <div v-if="!isDone" class="my-4 text-center">
        <p class="flashcard-question text-lg">{{ current.question }}</p>
        <p
          v-if="revealed"
          class="flashcard-answer mt-3 text-lg text-(--link-accent)"
        >
          {{ current.answer }}
        </p>
      </div>
      <p v-else class="flashcard-done my-4 text-center text-lg">Done</p>
      <div class="flex justify-center">
        <button v-if="isDone" class="btn btn-sm" @click="restart">
          Restart
        </button>
        <button v-else-if="!revealed" class="btn btn-sm" @click="reveal">
          Reveal
        </button>
        <button v-else-if="single" class="btn btn-sm" @click="revealed = false">
          Hide
        </button>
        <button v-else class="btn btn-sm" @click="next">Next</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

import {
  formatFraction,
  formatHands,
  parsePeople,
  snapFraction,
  totalHands
} from "../primeHand"
import { consumeRows, type InstrumentProps } from "../sibling"

const props = defineProps<InstrumentProps>()

const table = consumeRows(props.sibling)

const people = parsePeople(table)
const hasPeople = people.length > 0

const index = ref(0)
const ratings = ref<number[]>([])
// The detail column comes back only if the reader asks for it — they chose to
// drop it.
const linesRestored = ref(false)

const current = computed(() => people[index.value])
const isDone = computed(() => index.value >= people.length)
const progress = computed(
  () => `${Math.min(index.value + 1, people.length)} / ${people.length}`
)

// Slider steps in quarter hands: 1 → ¼, 4 → 1 prime hand.
const quarters = ref(4)
const fraction = computed(() => snapFraction(quarters.value / 4))

const total = computed(() => formatHands(totalHands(ratings.value)))

const record = () => {
  ratings.value = [...ratings.value, fraction.value]
  index.value++
  quarters.value = 4
}

const restart = () => {
  ratings.value = []
  index.value = 0
  quarters.value = 4
  linesRestored.value = false
}
</script>

<template>
  <div
    class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"
  >
    <p v-if="!hasPeople" class="text-center text-sm opacity-60">
      Add a markdown table right below :::{{ name }}:::
    </p>

    <template v-else-if="!isDone">
      <div class="flex items-center justify-between text-xs opacity-60">
        <span>Rate as a share of a prime hand</span>
        <span class="prime-hand-progress tabular-nums">{{ progress }}</span>
      </div>

      <p class="prime-hand-name mt-3 text-lg">{{ current.name }}</p>
      <p class="prime-hand-detail mt-1 text-base text-base-content/80">
        {{ current.detail }}
      </p>
      <p v-if="current.output" class="mt-1 text-sm tabular-nums opacity-60">
        {{ current.output }}
      </p>

      <label class="mt-4 block">
        <span class="flex justify-between text-sm text-base-content/60">
          <span>Rating</span>
          <span class="prime-hand-rating tabular-nums text-(--link-accent)">
            {{ formatFraction(fraction) }} hand
          </span>
        </span>
        <input
          v-model.number="quarters"
          type="range"
          class="range range-xs"
          min="1"
          max="4"
          step="1"
          aria-label="Rating in quarters of a prime hand"
        />
      </label>

      <div class="mt-3 flex justify-center">
        <button class="btn btn-sm" @click="record">Record</button>
      </div>
    </template>

    <template v-else>
      <table class="prime-hand-ledger w-full text-sm">
        <thead>
          <tr class="text-base-content/60">
            <th class="text-left font-normal">Hand</th>
            <th
              v-if="linesRestored"
              class="prime-hand-lines-header text-left font-normal"
            >
              Between the lines
            </th>
            <th class="text-right font-normal">Rated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(person, row) in people" :key="person.name">
            <td class="py-0.5">{{ person.name }}</td>
            <td
              v-if="linesRestored"
              class="prime-hand-restored py-0.5 text-base-content/80"
            >
              {{ person.detail }}
            </td>
            <td class="py-0.5 text-right tabular-nums">
              {{ formatFraction(ratings[row]) }}
            </td>
          </tr>
        </tbody>
      </table>

      <p class="prime-hand-total mt-3 border-t border-base-300 pt-2">
        {{ people.length }} people →
        <span class="font-mono text-2xl tabular-nums text-(--link-accent)">
          {{ total }}
        </span>
        hands
      </p>
      <p class="mt-1 text-sm text-base-content/60">
        Comparable now, without reference to individuals.
      </p>

      <div class="mt-3 flex justify-center gap-2">
        <button class="btn btn-sm" @click="linesRestored = !linesRestored">
          {{ linesRestored ? "Close the ledger" : "Restore the lines" }}
        </button>
        <button class="btn btn-ghost btn-sm" @click="restart">Again</button>
      </div>
    </template>
  </div>
</template>

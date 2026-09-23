<script lang="ts" setup>
import { computed, ref, watch } from "vue"

import FlipCard from "@/modules/card/components/FlipCard.vue"
import { Repetition } from "@/modules/card/hooks/useSpacedRepetitionCards"

const props = defineProps<{ cards: Repetition[] }>()
const emits = defineEmits<{
  success: [id: string]
  fail: [id: string]
  needsReview: [id: string]
}>()

const queue = ref<Repetition[]>([])
const currentIndex = ref(0)

// Highest level first: those cards have waited the longest, so they get the
// attention while it is still fresh.
watch(
  () => props.cards,
  (cards) => {
    queue.value = [...cards].sort(
      (a, b) => b.repetition.level - a.repetition.level
    )
    currentIndex.value = 0
  },
  { immediate: true }
)

const current = computed(() => queue.value.at(currentIndex.value))
const remaining = computed(() => queue.value.length - currentIndex.value)

const currentId = computed(() => current.value?.repetition._id ?? "")

const success = () => {
  if (!current.value) return
  emits("success", currentId.value)
  currentIndex.value++
}

const fail = () => {
  const failed = current.value
  if (!failed) return
  emits("fail", currentId.value)
  // Back of the queue: a missed card is worth a second pass today.
  queue.value.push(failed)
  currentIndex.value++
}

const needsReview = () => {
  if (!current.value) return
  emits("needsReview", currentId.value)
  currentIndex.value++
}
</script>

<template>
  <div class="flip-card-list">
    <template v-if="current">
      <header class="flip-card-header not-prose">
        <span>Level {{ current.repetition.level }}</span>
        <span>{{ remaining }} left</span>
      </header>

      <flip-card
        :key="`${currentId}-${currentIndex}`"
        :card="current.card"
        @success="success"
        @fail="fail"
        @needs-review="needsReview"
      />
    </template>
    <div v-else>No more cards to check!</div>
  </div>
</template>

<style scoped lang="scss">
.flip-card-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;

  .flip-card-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    opacity: 0.7;
  }
}
</style>

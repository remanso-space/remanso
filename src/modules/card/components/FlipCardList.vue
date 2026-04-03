<script lang="ts" setup>
import { computed, ref } from "vue"

import FlipCard from "@/modules/card/components/FlipCard.vue"
import { Repetition } from "@/modules/card/hooks/useSpacedRepetitionCards"

const props = defineProps<{ cards: Repetition[] }>()
const emits = defineEmits<{
  success: [id: string]
  fail: [id: string]
  needsReview: [id: string]
}>()

const propCards = computed(() => props.cards)

const sortedCards = ref(
  [...propCards.value].sort((a, b) =>
    a.repetition.level > b.repetition.level ? -1 : 1
  )
)

const currentIndex = ref(0)

const goToNextCard = (success: boolean) => {
  const id = sortedCards.value[currentIndex.value].repetition._id ?? ""

  if (success) {
    emits("success", id)
  } else {
    const failedCard = sortedCards.value.at(currentIndex.value)
    if (failedCard) {
      sortedCards.value.push(failedCard)
    }
    emits("fail", id)
  }

  currentIndex.value++
}

const needsReview = () => {
  const id = sortedCards.value[currentIndex.value].repetition._id ?? ""
  emits("needsReview", id)
  currentIndex.value++
}
</script>

<template>
  <div class="flip-card-list">
    <h3 class="subtitle is-3">
      Level: {{ sortedCards[currentIndex].repetition.level }}
    </h3>
    <h4>cards left: {{ sortedCards.length - currentIndex }}</h4>

    <div v-if="currentIndex < sortedCards.length">
      <flip-card
        v-for="(card, index) in sortedCards"
        :key="card.repetition._id ?? ''"
        class="card"
        :style="{
          left: `${(index - currentIndex) * 550}px`
        }"
        :card="card.card"
        @success="goToNextCard(true)"
        @fail="goToNextCard(false)"
        @needs-review="needsReview"
      />
    </div>
    <div v-else>No more cards to check!</div>
  </div>
</template>

<style scoped lang="scss">
.flip-card-list {
  overflow-x: hidden;
  flex: 1;

  .card {
    position: relative;
    transition: left 0.7s ease-out;
  }
}
</style>

<script setup lang="ts">
import { computed } from "vue"

import FluxNote from "@/components/FluxNote.vue"
import { useNeedReviewCards } from "@/modules/card/hooks/useNeedReviewCards"
import { cardPathFromId } from "@/modules/card/services/repetitionSync"

defineProps<{
  user: string
  repo: string
}>()

const { cardsToReview } = useNeedReviewCards()
const cardNames = computed(() =>
  cardsToReview.value.map((card) => ({
    id: card._id,
    name: cardPathFromId(card._id ?? "")
  }))
)
</script>

<template>
  <div class="needs-review-cards">
    <flux-note
      key="needs-review-cards"
      class="card-container"
      :user="user"
      :repo="repo"
      :with-content="false"
    >
      needs review cards
      <ul>
        <li v-for="card in cardNames" :key="card.id">
          {{ card.name }}
        </li>
      </ul>
    </flux-note>
  </div>
</template>

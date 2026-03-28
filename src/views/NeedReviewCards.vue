<script setup lang="ts">
import { computed } from "vue"

import FluxNote from "@/components/FluxNote.vue"
import { DataType } from "@/data/DataType.enum"
import { useNeedReviewCards } from "@/modules/card/hooks/useNeedReviewCards"

defineProps<{
  user: string
  repo: string
}>()

const { cardsToReview } = useNeedReviewCards()
const cardNames = computed(() =>
  cardsToReview.value.map((card) => ({
    id: card._id,
    name: card._id?.split(DataType.RepetitionCard).pop()
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

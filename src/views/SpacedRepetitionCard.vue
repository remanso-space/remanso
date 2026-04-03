<script lang="ts" setup>
import FluxNote from "@/components/FluxNote.vue"
import FlipCardList from "@/modules/card/components/FlipCardList.vue"
import { useSpacedRepetitionCards } from "@/modules/card/hooks/useSpacedRepetitionCards"

defineProps<{
  user: string
  repo: string
}>()

const { cards, isLoading, successRepetition, failRepetition, needsReview } =
  useSpacedRepetitionCards()
</script>

<template>
  <div class="spaced-repetition-card repo-note">
    <flux-note
      key="spaced-repetition-card"
      class="card-container"
      :user="user"
      :repo="repo"
      :with-content="false"
    >
      <section v-if="isLoading">Loading...</section>
      <section v-else-if="cards.length" class="cards">
        <flip-card-list
          :cards="cards"
          @success="successRepetition"
          @fail="failRepetition"
          @needs-review="needsReview"
        />
      </section>
      <section v-else>No cards to review!</section>
      <router-link :to="{ name: 'NeedReviewCards', params: { user, repo } }">
        needs review cards
      </router-link>
    </flux-note>
  </div>
</template>

<style scoped lang="scss">
.spaced-repetition-card {
  display: flex;
  flex: 1;

  .card-container {
    display: flex;
    flex-direction: column;
  }

  .cards {
    flex: 1;
    display: flex;
  }
}
</style>

<script lang="ts" setup>
import { ref } from "vue"

import { Card } from "../models/Card"

defineProps<{ card: Card }>()
const emit = defineEmits<{ success: []; fail: []; needsReview: [] }>()

const flipped = ref(false)
const flip = () => {
  flipped.value = !flipped.value
}

const success = () => emit("success")
const fail = () => emit("fail")
const needsReview = () => emit("needsReview")
</script>

<template>
  <div class="flip-card" :class="{ flipped }" @click="flip">
    <div class="flip-card-inner">
      <div class="flip-card-front flip-card-content" v-html="card.front"></div>
      <div class="flip-card-back flip-card-content">
        <div class="back" v-html="card.back"></div>
        <template v-if="card.references">
          <hr />
          <div class="references" v-html="card.references"></div>
        </template>
        <hr />
        <div class="actions not-prose">
          <p>Did you remember this?</p>
          <div class="buttons">
            <button class="btn btn-sm btn-warning" @click.stop="fail">
              failed
            </button>
            <button class="btn btn-sm btn-success" @click.stop="success">
              got it
            </button>
            <button class="btn btn-sm btn-ghost" @click.stop="needsReview">
              <em>needs review</em>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.flip-card {
  display: flex;
  background-color: transparent;
  margin: auto;
  width: 100%;
  user-select: none;
  perspective: 1500px;

  &:hover {
    cursor: pointer;
  }

  /**
   * Both faces share one grid cell: the card keeps the height of the taller
   * face instead of collapsing, which is what absolute positioning did.
   */
  .flip-card-inner {
    flex: 1;
    display: grid;
    transition: transform cubic-bezier(0.39, 0.575, 0.565, 1) 0.4s;
    transform-style: preserve-3d;
  }

  &.flipped .flip-card-inner {
    transform: rotateY(180deg);
  }

  .flip-card-front,
  .flip-card-back {
    grid-area: 1 / 1;
    backface-visibility: hidden;
  }

  .flip-card-content {
    background-color: var(--color-base-200);
    color: var(--color-base-content);
    border: 1px solid var(--color-base-300);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-y: auto;
  }

  .flip-card-back {
    transform: rotateY(180deg);
  }

  h1 {
    font-size: 1.25rem;
  }
}

.actions {
  text-align: center;

  p {
    margin-bottom: 0.5rem;
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>

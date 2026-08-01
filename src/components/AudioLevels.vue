<script lang="ts" setup>
defineProps<{
  /** Rolling RMS window, 0-1, oldest first. */
  levels: number[]
  /** Frozen bars read as a stalled UI, so say when the pause is deliberate. */
  paused?: boolean
}>()

// A bar at exactly 0 collapses to nothing and the row looks broken during
// silence. Keep a hairline so the baseline stays visible.
const MIN_HEIGHT = 6

const heightOf = (level: number) =>
  `${MIN_HEIGHT + level * (100 - MIN_HEIGHT)}%`
</script>

<template>
  <div
    class="audio-levels"
    :class="{ paused }"
    role="img"
    aria-label="Microphone level"
  >
    <span
      v-for="(level, index) in levels"
      :key="index"
      class="bar"
      :style="{ height: heightOf(level) }"
    ></span>
  </div>
</template>

<style lang="scss" scoped>
.audio-levels {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 3rem;
  margin: 1rem 0;

  &.paused {
    opacity: 0.4;
  }
}

.bar {
  flex: 1;
  min-width: 2px;
  border-radius: 1px;
  background: var(--link-accent);
  // The sample rate is the animation — a transition on top of it only smears
  // the bars. Keep just enough to take the edge off.
  transition: height 60ms linear;
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    transition: none;
  }
}
</style>

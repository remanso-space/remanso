import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import AudioLevels from "@/components/AudioLevels.vue"

const heights = (levels: number[], paused = false) =>
  mount(AudioLevels, { props: { levels, paused } })
    .findAll(".bar")
    .map((bar) => bar.attributes("style"))

describe("AudioLevels", () => {
  it("draws one bar per sample", () => {
    expect(heights([0, 0.5, 1])).toHaveLength(3)
  })

  // A bar at exactly 0 collapses to nothing and the row looks broken during
  // silence, so silence keeps a hairline.
  it("keeps a visible baseline at silence and fills at peak", () => {
    const [silent, peak] = heights([0, 1])

    expect(silent).toBe("height: 6%;")
    expect(peak).toBe("height: 100%;")
  })

  it("marks the row as paused so frozen bars don't read as a stall", () => {
    expect(
      mount(AudioLevels, { props: { levels: [0], paused: true } }).classes()
    ).toContain("paused")
  })
})

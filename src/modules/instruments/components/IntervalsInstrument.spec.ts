import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { beep, primeAudio } from "@/modules/instruments/audio"
import IntervalsInstrument from "@/modules/instruments/components/IntervalsInstrument.vue"

vi.mock("@/modules/instruments/audio", () => ({
  beep: vi.fn(),
  primeAudio: vi.fn()
}))

const mountIntervals = (args: string) =>
  mount(IntervalsInstrument, { props: { args, name: "intervals" } })

const display = (wrapper: ReturnType<typeof mountIntervals>) =>
  wrapper.get("span.font-mono").text()

describe("IntervalsInstrument", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the first step, counter, and next step preview", () => {
    const wrapper = mountIntervals("2m warmup, 30s plank, 2m récup")
    expect(display(wrapper)).toBe("02:00")
    expect(wrapper.text()).toContain("warmup")
    expect(wrapper.text()).toContain("step 1 / 3")
    expect(wrapper.text()).toContain("next: plank 30s")
    expect(wrapper.get("progress").attributes("max")).toBe("270")
  })

  it("shows a muted hint for invalid args", () => {
    const wrapper = mountIntervals("garbage")
    expect(wrapper.text()).toContain(
      "expected :::intervals 15m warmup, 1m plank:::"
    )
    expect(wrapper.find("progress").exists()).toBe(false)
    expect(wrapper.find("button").exists()).toBe(false)
  })

  it("beeps and auto-advances to the next step when a step ends", async () => {
    const wrapper = mountIntervals("2s warmup, 30s plank")
    await wrapper.get('[title="Start"]').trigger("click")
    expect(primeAudio).toHaveBeenCalled()
    vi.advanceTimersByTime(2100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("step 2 / 2")
    expect(wrapper.text()).toContain("plank")
    expect(display(wrapper)).toBe("00:30")
    expect(beep).toHaveBeenCalledTimes(1)
  })

  it("skips to the next step without beeping", async () => {
    const wrapper = mountIntervals("2m warmup, 1m plank")
    await wrapper.get('[title="Skip"]').trigger("click")
    expect(wrapper.text()).toContain("step 2 / 2")
    expect(display(wrapper)).toBe("01:00")
    expect(beep).not.toHaveBeenCalled()
  })

  it("pauses and freezes the countdown", async () => {
    const wrapper = mountIntervals("2m warmup, 1m plank")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(30_000)
    await wrapper.get('[title="Pause"]').trigger("click")
    expect(display(wrapper)).toBe("01:30")
    vi.advanceTimersByTime(30_000)
    await wrapper.vm.$nextTick()
    expect(display(wrapper)).toBe("01:30")
  })

  it("reaches a done state after the last step and beeps per transition", async () => {
    const wrapper = mountIntervals("1s a, 1s b")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(2100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Done")
    expect(wrapper.get("span.font-mono").classes()).toContain(
      "text-(--link-accent)"
    )
    expect(wrapper.get("span.font-mono").classes()).toContain("animate-pulse")
    expect(beep).toHaveBeenCalledTimes(2)
  })

  it("resets back to the first step", async () => {
    const wrapper = mountIntervals("2m warmup, 1m plank")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(30_000)
    await wrapper.get('[title="Skip"]').trigger("click")
    await wrapper.get('[title="Reset"]').trigger("click")
    expect(wrapper.text()).toContain("step 1 / 2")
    expect(display(wrapper)).toBe("02:00")
    expect(wrapper.text()).toContain("warmup")
  })

  it("restarts from step 1 when started again after done", async () => {
    const wrapper = mountIntervals("1s a, 1s b")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(2100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Done")
    await wrapper.get('[title="Start"]').trigger("click")
    expect(wrapper.text()).toContain("step 1 / 2")
    expect(display(wrapper)).toBe("00:01")
  })
})

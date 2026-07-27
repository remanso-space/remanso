import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import BreathInstrument from "@/modules/instruments/components/BreathInstrument.vue"

const mountBreath = (args: string) =>
  mount(BreathInstrument, { props: { args, name: "breath" } })

const countdown = (wrapper: ReturnType<typeof mountBreath>) =>
  wrapper.get("span.font-mono").text()

const circleScale = (wrapper: ReturnType<typeof mountBreath>) =>
  Number(
    /scale\(([\d.]+)\)/.exec(
      wrapper.get("div.breath-orb").attributes("style") ?? ""
    )?.[1]
  )

describe("BreathInstrument", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts on the inhale of the first breath", () => {
    const wrapper = mountBreath("4-7-8 x3")
    expect(wrapper.text()).toContain("Inhale")
    expect(countdown(wrapper)).toBe("4s")
    expect(wrapper.text()).toContain("breath 1 / 3")
    expect(wrapper.get("progress").attributes("max")).toBe("57")
    expect(circleScale(wrapper)).toBeCloseTo(0.45)
  })

  it("defaults to box breathing when no args are given", () => {
    const wrapper = mountBreath("")
    expect(countdown(wrapper)).toBe("4s")
    expect(wrapper.text()).toContain("breath 1 / 6")
    expect(wrapper.get("progress").attributes("max")).toBe("96")
  })

  it("grows the circle through the inhale and holds it full", async () => {
    const wrapper = mountBreath("4-7-8 x1")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(circleScale(wrapper)).toBeCloseTo(0.725)

    vi.advanceTimersByTime(2100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Hold")
    expect(circleScale(wrapper)).toBeCloseTo(1)
  })

  it("walks inhale → hold → exhale, then the next breath", async () => {
    const wrapper = mountBreath("1-1-1 x2")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(1100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Hold")

    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Exhale")

    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Inhale")
    expect(wrapper.text()).toContain("breath 2 / 2")
  })

  it("finishes after the last phase of the last breath", async () => {
    const wrapper = mountBreath("1-1-1 x1")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(3100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Done")
    expect(wrapper.text()).toContain("breath 1 / 1")
    expect(wrapper.get("progress").attributes("value")).toBe("3")
    expect(wrapper.get("span.font-mono").classes()).toContain("animate-pulse")
  })

  it("pauses and freezes both countdown and circle", async () => {
    const wrapper = mountBreath("10-10 x1")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(4000)
    await wrapper.get('[title="Pause"]').trigger("click")
    const frozen = circleScale(wrapper)
    expect(countdown(wrapper)).toBe("6s")
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(countdown(wrapper)).toBe("6s")
    expect(circleScale(wrapper)).toBeCloseTo(frozen)
  })

  it("resets to the first breath and restarts after done", async () => {
    const wrapper = mountBreath("1-1-1 x2")
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(2100)
    await wrapper.get('[title="Reset"]').trigger("click")
    expect(wrapper.text()).toContain("Inhale")
    expect(wrapper.text()).toContain("breath 1 / 2")
    expect(countdown(wrapper)).toBe("1s")

    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(6100)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Done")
    await wrapper.get('[title="Start"]').trigger("click")
    expect(wrapper.text()).toContain("Inhale")
    expect(wrapper.text()).toContain("breath 1 / 2")
  })

  it("shows a muted hint for invalid args", () => {
    const wrapper = mountBreath("garbage")
    expect(wrapper.text()).toContain("expected :::breath 4-7-8:::")
    expect(wrapper.find("button").exists()).toBe(false)
    expect(wrapper.find("progress").exists()).toBe(false)
  })
})

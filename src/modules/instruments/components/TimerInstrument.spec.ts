import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import TimerInstrument from "@/modules/instruments/components/TimerInstrument.vue"

const display = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get("span.font-mono").text()

describe("TimerInstrument", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows the parsed duration and no input when args are given", () => {
    const wrapper = mount(TimerInstrument, { props: { args: "2m" } })
    expect(display(wrapper)).toBe("02:00")
    expect(wrapper.find("input").exists()).toBe(false)
  })

  it("shows a minutes input when args are missing", async () => {
    const wrapper = mount(TimerInstrument, { props: { args: "" } })
    expect(display(wrapper)).toBe("05:00")
    await wrapper.get("input").setValue(1)
    expect(display(wrapper)).toBe("01:00")
  })

  it("counts down and reaches a done state", async () => {
    const wrapper = mount(TimerInstrument, { props: { args: "1s" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(1100)
    await vi.waitFor(() => expect(display(wrapper)).toBe("00:00"))
    expect(wrapper.get("span.font-mono").classes()).toContain(
      "text-(--link-accent)"
    )
  })

  it("pauses and resumes", async () => {
    const wrapper = mount(TimerInstrument, { props: { args: "2m" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(30_000)
    await wrapper.get('[title="Pause"]').trigger("click")
    expect(display(wrapper)).toBe("01:30")
    vi.advanceTimersByTime(30_000)
    await wrapper.vm.$nextTick()
    expect(display(wrapper)).toBe("01:30")
  })

  it("resets to the initial duration", async () => {
    const wrapper = mount(TimerInstrument, { props: { args: "2m" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(30_000)
    await wrapper.get('[title="Reset"]').trigger("click")
    expect(display(wrapper)).toBe("02:00")
  })
})

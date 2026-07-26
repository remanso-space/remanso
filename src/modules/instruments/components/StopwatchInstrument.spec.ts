import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import StopwatchInstrument from "@/modules/instruments/components/StopwatchInstrument.vue"

const display = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get("span.font-mono").text()

describe("StopwatchInstrument", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts at zero", () => {
    const wrapper = mount(StopwatchInstrument, { props: { args: "" } })
    expect(display(wrapper)).toBe("00:00.0")
  })

  it("runs and pauses", async () => {
    const wrapper = mount(StopwatchInstrument, { props: { args: "" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(3200)
    await wrapper.get('[title="Pause"]').trigger("click")
    expect(display(wrapper)).toBe("00:03.2")
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(display(wrapper)).toBe("00:03.2")
  })

  it("records laps with deltas and totals", async () => {
    const wrapper = mount(StopwatchInstrument, { props: { args: "" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(3000)
    await wrapper.get('[title="Lap"]').trigger("click")
    vi.advanceTimersByTime(2000)
    await wrapper.get('[title="Lap"]').trigger("click")
    const laps = wrapper.findAll("li")
    expect(laps).toHaveLength(2)
    expect(laps[1].text()).toContain("+00:02.0")
    expect(laps[1].text()).toContain("00:05.0")
  })

  it("restart zeroes, clears laps, and keeps running", async () => {
    const wrapper = mount(StopwatchInstrument, { props: { args: "" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(3000)
    await wrapper.get('[title="Lap"]').trigger("click")
    await wrapper.get('[title="Restart"]').trigger("click")
    expect(wrapper.findAll("li")).toHaveLength(0)
    vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()
    expect(display(wrapper)).toBe("00:00.5")
  })

  it("stop zeroes and halts", async () => {
    const wrapper = mount(StopwatchInstrument, { props: { args: "" } })
    await wrapper.get('[title="Start"]').trigger("click")
    vi.advanceTimersByTime(3000)
    await wrapper.get('[title="Stop"]').trigger("click")
    expect(display(wrapper)).toBe("00:00.0")
    vi.advanceTimersByTime(2000)
    await wrapper.vm.$nextTick()
    expect(display(wrapper)).toBe("00:00.0")
  })
})

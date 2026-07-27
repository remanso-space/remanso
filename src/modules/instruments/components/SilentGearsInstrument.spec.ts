import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import SilentGearsInstrument from "@/modules/instruments/components/SilentGearsInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Cause", "Deaths per year", "Called violence"],
  rows: [
    ["Hunger", "3650", "no"],
    ["Work", "730", "no"],
    ["Riots", "365", "yes"]
  ]
}

const mountGears = (args = "") =>
  mount(SilentGearsInstrument, {
    props: { args, name: "silent-gears", table }
  })

type Wrapper = ReturnType<typeof mountGears>

const play = async (wrapper: Wrapper, ms: number) => {
  await wrapper.get('button[aria-label="Start"]').trigger("click")
  vi.advanceTimersByTime(ms)
  await wrapper.vm.$nextTick()
}

const silentCounts = (wrapper: Wrapper) =>
  wrapper.findAll(".gears-silent .gears-count").map((cell) => cell.text())

describe("SilentGearsInstrument", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts stopped with every counter at zero", () => {
    const wrapper = mountGears()
    expect(wrapper.get(".gears-elapsed").text()).toBe("0 d")
    expect(silentCounts(wrapper)).toEqual(["0", "0"])
    expect(wrapper.find(".gears-ratio").exists()).toBe(false)
  })

  it("accumulates the silent tolls while the clock runs", async () => {
    const wrapper = mountGears("speed=365")
    await play(wrapper, 1000)
    expect(wrapper.get(".gears-elapsed").text()).toBe("1 y")
    expect(silentCounts(wrapper)).toEqual(["3,650", "730"])
  })

  it("labels only the named toll as violence", async () => {
    const wrapper = mountGears("speed=365")
    await play(wrapper, 1000)
    const named = wrapper.get(".gears-named")
    expect(named.text()).toContain("Violence")
    expect(named.text()).toContain("365")
    expect(wrapper.get(".gears-silent").text()).not.toContain("Violence")
  })

  it("states the ratio of unnamed dead to named ones", async () => {
    const wrapper = mountGears("speed=365")
    await play(wrapper, 1000)
    expect(wrapper.get(".gears-ratio").text()).toContain("12")
  })

  it("freezes the counters on pause and clears them on reset", async () => {
    const wrapper = mountGears("speed=365")
    await play(wrapper, 1000)
    await wrapper.get('button[aria-label="Pause"]').trigger("click")
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    expect(silentCounts(wrapper)).toEqual(["3,650", "730"])

    await wrapper.get('button[aria-label="Reset"]').trigger("click")
    expect(silentCounts(wrapper)).toEqual(["0", "0"])
    expect(wrapper.get(".gears-elapsed").text()).toBe("0 d")
  })

  it("resumes from where the pause left the clock", async () => {
    const wrapper = mountGears("speed=365")
    await play(wrapper, 1000)
    await wrapper.get('button[aria-label="Pause"]').trigger("click")
    await play(wrapper, 1000)
    expect(wrapper.get(".gears-elapsed").text()).toBe("2 y")
  })

  it("falls back to the default tolls without a table", () => {
    const wrapper = mount(SilentGearsInstrument, {
      props: { args: "", name: "silent-gears" }
    })
    expect(wrapper.text()).toContain("Hunger")
    expect(wrapper.get(".gears-named").text()).toContain("Terrorism and riots")
  })
})

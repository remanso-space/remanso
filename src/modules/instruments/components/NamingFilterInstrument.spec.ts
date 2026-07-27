import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import NamingFilterInstrument from "@/modules/instruments/components/NamingFilterInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Event", "Lives", "Kind"],
  rows: [
    ["Gas cut off", "100", "institutional"],
    ["Refinery blockaded", "0", "revolutionary"],
    ["Station burns", "2", "revolutionary"],
    ["Square cleared", "40", "repressive"]
  ]
}

const mountFilter = () =>
  mount(NamingFilterInstrument, {
    props: { args: "", name: "naming-filter", table }
  })

type Wrapper = ReturnType<typeof mountFilter>

const setLens = async (wrapper: Wrapper, index: number) => {
  await wrapper.get('input[type="range"]').setValue(index)
}

const countedTexts = (wrapper: Wrapper) =>
  wrapper.findAll(".filter-counted").map((item) => item.text())

describe("NamingFilterInstrument", () => {
  it("counts only the revolutionary events at the narrowest lens", () => {
    const wrapper = mountFilter()
    expect(countedTexts(wrapper)).toEqual([
      "Refinery blockaded0",
      "Station burns2"
    ])
    expect(wrapper.findAll(".filter-uncounted")).toHaveLength(2)
  })

  it("shows how few of the lives the word covers", () => {
    const wrapper = mountFilter()
    expect(wrapper.get(".filter-tally").text()).toBe(
      "Called violence: 2 of 4 events · 2 of 142 lives."
    )
  })

  it("names the hypocrisy while the lens stays narrow", () => {
    const wrapper = mountFilter()
    expect(wrapper.get(".filter-closing").text()).toContain("hypocrisy")
  })

  it("adds the repressive violence at the middle lens", async () => {
    const wrapper = mountFilter()
    await setLens(wrapper, 1)
    expect(countedTexts(wrapper)).toContain("Square cleared40")
    expect(wrapper.get(".filter-tally").text()).toContain("3 of 4 events")
    expect(wrapper.get(".filter-tally").text()).toContain("42 of 142 lives")
  })

  it("covers every life at the widest lens without changing the total", async () => {
    const wrapper = mountFilter()
    await setLens(wrapper, 2)
    expect(wrapper.findAll(".filter-uncounted")).toHaveLength(0)
    expect(wrapper.get(".filter-tally").text()).toContain("142 of 142 lives")
    expect(wrapper.get(".filter-closing").text()).toContain("first violence")
  })

  it("falls back to the default events without a table", () => {
    const wrapper = mount(NamingFilterInstrument, {
      props: { args: "", name: "naming-filter" }
    })
    expect(wrapper.get(".filter-tally").text()).toContain("of 7 events")
  })
})

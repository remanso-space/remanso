import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import ColorblindResortInstrument from "@/modules/instruments/components/ColorblindResortInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Personne", "Couleur", "Où"],
  rows: [
    ["A family", "White", "The neighbourhood"],
    ["A family", "Black", "The ghetto"],
    ["A worker", "White", "Inside"],
    ["A worker", "Black", "Outside"]
  ]
}

const mountResort = () =>
  mount(ColorblindResortInstrument, {
    props: { args: "", name: "colorblind-resort", table }
  })

type Wrapper = ReturnType<typeof mountResort>

const toggleColorblind = async (wrapper: Wrapper) => {
  await wrapper.get('input[type="checkbox"]').setValue(true)
}

describe("ColorblindResortInstrument", () => {
  it("names the colour and the split at first", () => {
    const wrapper = mountResort()
    const colors = wrapper.findAll(".resort-color").map((c) => c.text())
    expect(colors).toEqual(["White", "Black", "White", "Black"])
    expect(wrapper.get(".resort-tally").text()).toBe(
      "Colour named: 2 of 2 still sorted."
    )
  })

  it("hides the colour but leaves the split unmoved", async () => {
    const wrapper = mountResort()
    await toggleColorblind(wrapper)
    const colors = wrapper.findAll(".resort-color").map((c) => c.text())
    expect(colors).toEqual(["—", "—", "—", "—"])
    expect(wrapper.get(".resort-tally").text()).toBe(
      "Colour hidden: 2 of 2 still sorted."
    )
    expect(wrapper.get(".resort-closing").text()).toContain("didn't move")
  })

  it("falls back to the default cases without a table", () => {
    const wrapper = mount(ColorblindResortInstrument, {
      props: { args: "", name: "colorblind-resort" }
    })
    expect(wrapper.findAll(".resort-cases li").length).toBeGreaterThan(0)
  })
})

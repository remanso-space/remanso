import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import CoincidenceStackInstrument from "@/modules/instruments/components/CoincidenceStackInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Institution", "Ce qu'on sait", "Bénéfice du doute"],
  rows: [
    ["The church", "Segregated Sunday", "50 %"],
    ["The unions", "Not in their unions", "50 %"],
    ["The lobby", "Kept in the ghetto", "50 %"],
    ["The schools", "Textbooks erase them", "50 %"]
  ]
}

const mountStack = () =>
  mount(CoincidenceStackInstrument, {
    props: { args: "", name: "coincidence-stack", table }
  })

type Wrapper = ReturnType<typeof mountStack>

const count = async (wrapper: Wrapper, index: number) => {
  await wrapper.findAll('input[type="checkbox"]')[index].setValue(true)
}

describe("CoincidenceStackInstrument", () => {
  it("rules nothing out before an institution is counted", () => {
    const wrapper = mountStack()
    expect(wrapper.get(".stack-probability").text()).toContain(
      "Nothing ruled out"
    )
    expect(wrapper.get(".stack-closing").text()).toContain("Count one")
  })

  it("halves the innocence with each institution counted", async () => {
    const wrapper = mountStack()
    await count(wrapper, 0)
    expect(wrapper.get(".stack-probability").text()).toContain("50%")
    await count(wrapper, 1)
    expect(wrapper.get(".stack-probability").text()).toContain("25%")
  })

  it("collapses to a rounding error and turns red once every one is counted", async () => {
    const wrapper = mountStack()
    for (let index = 0; index < 4; index++) await count(wrapper, index)
    expect(wrapper.get(".stack-probability").text()).toContain("6.3%")
    expect(wrapper.find(".stack-probability .text-error").exists()).toBe(true)
    expect(wrapper.get(".stack-closing").text()).toContain("rounding error")
  })

  it("falls back to the default institutions without a table", () => {
    const wrapper = mount(CoincidenceStackInstrument, {
      props: { args: "", name: "coincidence-stack" }
    })
    expect(wrapper.findAll(".stack-institutions li")).toHaveLength(5)
  })
})

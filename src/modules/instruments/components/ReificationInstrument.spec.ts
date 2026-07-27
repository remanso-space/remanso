import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import ReificationInstrument from "@/modules/instruments/components/ReificationInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Miles", "What reaches the owner"],
  rows: [
    ["0", "Mary, fourteen, singing on the third row"],
    ["40", "Hand, rated ¾"],
    ["3000", "312 hands"]
  ]
}

const mountReification = (props: { table?: InstrumentTable } = {}) =>
  mount(ReificationInstrument, {
    props: { args: "", name: "reification", table: props.table ?? table }
  })

type Wrapper = ReturnType<typeof mountReification>

const setPosition = async (wrapper: Wrapper, position: number) => {
  await wrapper.get('input[type="range"]').setValue(position)
}

const lostTexts = (wrapper: Wrapper) =>
  wrapper.findAll(".reification-lost li").map((item) => item.text())

describe("ReificationInstrument", () => {
  it("starts in the row with the whole person and nothing lost", () => {
    const wrapper = mountReification()
    expect(wrapper.get(".reification-current").text()).toBe(
      "Mary, fourteen, singing on the third row"
    )
    expect(wrapper.get(".reification-miles").text()).toBe("0 mi")
    expect(wrapper.find(".reification-lost").exists()).toBe(false)
  })

  it("degrades the representation as the owner moves away", async () => {
    const wrapper = mountReification()
    await setPosition(wrapper, 100)
    expect(wrapper.get(".reification-current").text()).toBe("312 hands")
    expect(wrapper.get(".reification-miles").text()).toBe("4,000 mi")
  })

  it("keeps every passed stage in the lost list", async () => {
    const wrapper = mountReification()
    await setPosition(wrapper, 100)
    expect(lostTexts(wrapper)).toEqual([
      "Mary, fourteen, singing on the third row",
      "Hand, rated ¾"
    ])
  })

  it("does not restore what was lost when the slider comes back", async () => {
    const wrapper = mountReification()
    await setPosition(wrapper, 100)
    await setPosition(wrapper, 0)
    expect(wrapper.get(".reification-current").text()).toBe(
      "Mary, fourteen, singing on the third row"
    )
    expect(lostTexts(wrapper)).toHaveLength(2)
    expect(wrapper.text()).toContain("Coming back does not bring her back")
  })

  it("clears the lost list only on an explicit restart", async () => {
    const wrapper = mountReification()
    await setPosition(wrapper, 100)
    const again = wrapper
      .findAll("button")
      .find((button) => button.text() === "Again")
    await again?.trigger("click")
    expect(wrapper.find(".reification-lost").exists()).toBe(false)
    expect(wrapper.get(".reification-miles").text()).toBe("0 mi")
  })

  it("falls back to the default sequence without a table", () => {
    const wrapper = mount(ReificationInstrument, {
      props: { args: "", name: "reification" }
    })
    expect(wrapper.get(".reification-current").text()).toContain("Mary")
  })
})

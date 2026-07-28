import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import SablierInstrument from "@/modules/instruments/components/SablierInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Grain", "Durée d'un grain"],
  rows: [
    ["Le temps qui reste", "40 ans"],
    ["Un jour", "1 jour"],
    ["Une émotion", "15 minutes"]
  ]
}

const mountSablier = (props: { args?: string; table?: InstrumentTable } = {}) =>
  mount(SablierInstrument, {
    props: {
      args: props.args ?? "",
      name: "sablier",
      table: props.table ?? table
    }
  })

type Wrapper = ReturnType<typeof mountSablier>

const setPosition = async (wrapper: Wrapper, position: number) => {
  await wrapper.get('input[type="range"]').setValue(position)
}

describe("SablierInstrument", () => {
  it("starts at the coarsest grain, showing a single grain left", () => {
    const wrapper = mountSablier()
    expect(wrapper.get(".sablier-grain").text()).toBe("Le temps qui reste")
    expect(wrapper.get(".sablier-count").text()).toBe("1")
  })

  it("explodes the count as the grain gets finer, same stock", async () => {
    const wrapper = mountSablier()
    await setPosition(wrapper, 1)
    expect(wrapper.get(".sablier-grain").text()).toBe("Un jour")
    expect(wrapper.get(".sablier-count").text()).toBe("14,600")

    await setPosition(wrapper, 2)
    expect(wrapper.get(".sablier-grain").text()).toBe("Une émotion")
    expect(wrapper.get(".sablier-count").text()).toBe("1,401,600")
  })

  it("never changes the stock bar", async () => {
    const wrapper = mountSablier()
    const before = wrapper.get(".sablier-bar").attributes("class")
    await setPosition(wrapper, 2)
    expect(wrapper.get(".sablier-bar").attributes("class")).toBe(before)
  })

  it("reads the years horizon from inline args", () => {
    const wrapper = mountSablier({ args: "days=100" })
    // 100 days counted in the coarsest 40-year grain floors to zero left.
    expect(wrapper.get(".sablier-count").text()).toBe("0")
  })

  it("falls back to the default scale without a table", () => {
    const wrapper = mount(SablierInstrument, {
      props: { args: "", name: "sablier" }
    })
    expect(wrapper.get(".sablier-grain").text()).toBe("Le temps qui reste")
  })
})

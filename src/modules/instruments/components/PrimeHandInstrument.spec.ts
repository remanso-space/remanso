import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import PrimeHandInstrument from "@/modules/instruments/components/PrimeHandInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

const table: InstrumentTable = {
  header: ["Person", "Between the lines", "Picked"],
  rows: [
    ["Mary", "14. Sized rather than aged.", "148 lb"],
    ["Isaac", "Cut his own hand to slow the row.", "96 lb"]
  ]
}

const mountPrimeHand = (props: { table?: InstrumentTable } = {}) =>
  mount(PrimeHandInstrument, {
    props: { args: "", name: "prime-hand", table: props.table ?? table }
  })

type Wrapper = ReturnType<typeof mountPrimeHand>

const clickButton = async (wrapper: Wrapper, label: string) => {
  const button = wrapper
    .findAll("button")
    .find((candidate) => candidate.text() === label)
  expect(button, `button "${label}"`).toBeDefined()
  await button?.trigger("click")
}

const setRating = async (wrapper: Wrapper, quarters: number) => {
  await wrapper.get('input[type="range"]').setValue(quarters)
}

const rateAll = async (wrapper: Wrapper, quarters: number[]) => {
  for (const value of quarters) {
    await setRating(wrapper, value)
    await clickButton(wrapper, "Record")
  }
}

describe("PrimeHandInstrument", () => {
  it("shows the first person with their detail", () => {
    const wrapper = mountPrimeHand()
    expect(wrapper.get(".prime-hand-name").text()).toBe("Mary")
    expect(wrapper.get(".prime-hand-detail").text()).toBe(
      "14. Sized rather than aged."
    )
    expect(wrapper.get(".prime-hand-progress").text()).toBe("1 / 2")
  })

  it("labels the slider in quarters of a prime hand", async () => {
    const wrapper = mountPrimeHand()
    expect(wrapper.get(".prime-hand-rating").text()).toBe("1 hand")
    await setRating(wrapper, 2)
    expect(wrapper.get(".prime-hand-rating").text()).toBe("½ hand")
  })

  it("advances to the next person after recording", async () => {
    const wrapper = mountPrimeHand()
    await clickButton(wrapper, "Record")
    expect(wrapper.get(".prime-hand-name").text()).toBe("Isaac")
    expect(wrapper.get(".prime-hand-progress").text()).toBe("2 / 2")
  })

  it("drops the detail column into a ledger once everyone is rated", async () => {
    const wrapper = mountPrimeHand()
    await rateAll(wrapper, [3, 2])
    const ledger = wrapper.get(".prime-hand-ledger")
    expect(ledger.text()).toContain("Mary")
    expect(ledger.text()).toContain("¾")
    expect(ledger.text()).toContain("½")
    expect(wrapper.text()).not.toContain("14. Sized rather than aged.")
    expect(wrapper.get(".prime-hand-total").text()).toContain("2 people")
    expect(wrapper.get(".prime-hand-total").text()).toContain("1.25")
  })

  it("restores the erased lines only when asked", async () => {
    const wrapper = mountPrimeHand()
    await rateAll(wrapper, [4, 4])
    expect(wrapper.find(".prime-hand-restored").exists()).toBe(false)
    await clickButton(wrapper, "Restore the lines")
    expect(wrapper.findAll(".prime-hand-restored")[0].text()).toBe(
      "14. Sized rather than aged."
    )
    await clickButton(wrapper, "Close the ledger")
    expect(wrapper.find(".prime-hand-restored").exists()).toBe(false)
  })

  it("starts over from the first person", async () => {
    const wrapper = mountPrimeHand()
    await rateAll(wrapper, [1, 1])
    await clickButton(wrapper, "Again")
    expect(wrapper.get(".prime-hand-name").text()).toBe("Mary")
    expect(wrapper.get(".prime-hand-rating").text()).toBe("1 hand")
  })

  it("shows a hint when there is no table", () => {
    const wrapper = mountPrimeHand({ table: { header: [], rows: [] } })
    expect(wrapper.text()).toContain(
      "Add a markdown table right below :::prime-hand:::"
    )
    expect(wrapper.find("button").exists()).toBe(false)
  })
})

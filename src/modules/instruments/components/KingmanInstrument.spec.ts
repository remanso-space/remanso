import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import KingmanInstrument from "@/modules/instruments/components/KingmanInstrument.vue"

const mountKingman = (args = "u=80% ca=1 cs=1 t=10") =>
  mount(KingmanInstrument, { props: { args, name: "kingman" } })

const wipText = (wrapper: ReturnType<typeof mountKingman>) =>
  wrapper.get("span.font-mono").text()

describe("KingmanInstrument", () => {
  it("renders the M/M/1 WIP from args", () => {
    const wrapper = mountKingman()
    expect(wipText(wrapper)).toBe("4")
    expect(wrapper.text()).toContain("Little's Law")
  })

  it("prefills the sliders from the parsed args", () => {
    const wrapper = mountKingman("u=90% ca=1.5 cs=0.5 t=12")
    const values = wrapper
      .findAll("input[type=range]")
      .map((input) => (input.element as HTMLInputElement).value)
    expect(values).toEqual(["90", "1.5", "0.5", "12"])
  })

  it("recomputes the WIP when utilization rises", async () => {
    const wrapper = mountKingman()
    expect(wipText(wrapper)).toBe("4")
    await wrapper.get('input[aria-label="Utilization ρ"]').setValue("90")
    expect(wipText(wrapper)).toBe("9")
  })

  it("drops the wait to zero with no variability", async () => {
    const wrapper = mountKingman()
    await wrapper.get('input[aria-label="Arrival variability Ca"]').setValue("0")
    await wrapper.get('input[aria-label="Service variability Cs"]').setValue("0")
    expect(wrapper.text()).toContain("0 wait")
  })

  it("draws the cycle-time curve and the current point", () => {
    const wrapper = mountKingman()
    expect(wrapper.find("path").exists()).toBe(true)
    expect(wrapper.find("circle").exists()).toBe(true)
  })
})

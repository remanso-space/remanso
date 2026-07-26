import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import BayesInstrument from "@/modules/instruments/components/BayesInstrument.vue"

const mountBayes = (args = "prior=1% sensitivity=90% fpr=5%") =>
  mount(BayesInstrument, { props: { args, name: "bayes" } })

const posteriorText = (wrapper: ReturnType<typeof mountBayes>) =>
  wrapper.get("span.font-mono").text()

describe("BayesInstrument", () => {
  it("renders the medical test paradox posterior from args", () => {
    const wrapper = mountBayes()
    expect(posteriorText(wrapper)).toContain("15")
    expect(wrapper.text()).toContain("P(condition | positive test)")
  })

  it("prefills the sliders from the parsed args", () => {
    const wrapper = mountBayes()
    const values = wrapper
      .findAll("input[type=range]")
      .map((input) => (input.element as HTMLInputElement).value)
    expect(values).toEqual(["1", "90", "5"])
  })

  it("recomputes the posterior when a slider moves", async () => {
    const wrapper = mountBayes()
    const before = posteriorText(wrapper)
    const priorSlider = wrapper.get('input[aria-label="Prior"]')
    await priorSlider.setValue("50")
    expect(posteriorText(wrapper)).not.toBe(before)
    expect(posteriorText(wrapper)).toContain("94.7")
  })

  it("renders 1000 dots", () => {
    const wrapper = mountBayes()
    expect(wrapper.findAll("circle")).toHaveLength(1000)
  })

  it("renders the legend entries", () => {
    const wrapper = mountBayes()
    const text = wrapper.text()
    expect(text).toContain("sick + positive")
    expect(text).toContain("healthy + positive (false alarm)")
    expect(text).toContain("sick + negative (missed)")
    expect(text).toContain("healthy + negative")
  })
})

import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import UrnInstrument from "@/modules/instruments/components/UrnInstrument.vue"

const mountUrn = (args: string) =>
  mount(UrnInstrument, { props: { args, name: "urn" } })

describe("UrnInstrument", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("defaults to 1/20 with 20 circles and 5%", () => {
    const wrapper = mountUrn("")
    expect(wrapper.findAll(".rounded-full").length).toBe(20)
    expect(wrapper.text()).toContain("P(black) = 5%")
  })

  it("renders 3/10 with 10 circles and 30%", () => {
    const wrapper = mountUrn("3/10")
    expect(wrapper.findAll(".rounded-full").length).toBe(10)
    expect(wrapper.text()).toContain("P(black) = 30%")
  })

  it("draws a black ball when random falls below k/N", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const wrapper = mountUrn("1/20")
    await wrapper.get("button.btn-primary").trigger("click")
    expect(wrapper.text()).toContain("Black!")
    expect(wrapper.text()).toContain("draws: 1 · black: 1 (100%)")
    expect(wrapper.findAll(".rounded-full")[0].attributes("style")).toContain(
      "--link-accent"
    )
  })

  it("draws a white ball when random falls above k/N", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99)
    const wrapper = mountUrn("1/20")
    await wrapper.get("button.btn-primary").trigger("click")
    expect(wrapper.text()).toContain("White")
    expect(wrapper.text()).toContain("draws: 1 · black: 0 (0%)")
  })

  it("accumulates the tally over draws and resets it", async () => {
    const random = vi.spyOn(Math, "random")
    const wrapper = mountUrn("1/20")
    random.mockReturnValue(0)
    await wrapper.get("button.btn-primary").trigger("click")
    random.mockReturnValue(0.99)
    await wrapper.get("button.btn-primary").trigger("click")
    expect(wrapper.text()).toContain("draws: 2 · black: 1 (50%)")
    await wrapper.get('[title="Reset"]').trigger("click")
    expect(wrapper.text()).not.toContain("draws:")
    expect(wrapper.text()).not.toContain("Black!")
  })

  it("shows a hint for invalid args", () => {
    const wrapper = mountUrn("0/20")
    expect(wrapper.findAll(".rounded-full").length).toBe(0)
    expect(wrapper.text()).toContain("expected :::urn 1/20:::")
  })
})

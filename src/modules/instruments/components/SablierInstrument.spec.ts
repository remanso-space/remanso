import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

const zoomIn = (wrapper: Wrapper) =>
  wrapper.get('[aria-label="Zoom in"]').trigger("click")
const zoomOut = (wrapper: Wrapper) =>
  wrapper.get('[aria-label="Zoom out"]').trigger("click")
const dotCount = (wrapper: Wrapper) => wrapper.findAll(".sablier-dot").length

describe("SablierInstrument", () => {
  it("starts zoomed out: coarsest grain, one grain, one dot", () => {
    const wrapper = mountSablier()
    expect(wrapper.get(".sablier-grain").text()).toBe("Le temps qui reste")
    expect(wrapper.get(".sablier-count").text()).toBe("1")
    expect(dotCount(wrapper)).toBe(1)
  })

  it("cannot zoom out past the whole stock", () => {
    const wrapper = mountSablier()
    expect(
      wrapper.get('[aria-label="Zoom out"]').attributes("disabled")
    ).toBeDefined()
  })

  it("explodes the count as you zoom in, same stock, capped swarm", async () => {
    const wrapper = mountSablier()
    await zoomIn(wrapper)
    expect(wrapper.get(".sablier-grain").text()).toBe("Un jour")
    expect(wrapper.get(".sablier-count").text()).toBe("14,600")
    expect(dotCount(wrapper)).toBe(400)

    await zoomIn(wrapper)
    expect(wrapper.get(".sablier-grain").text()).toBe("Une émotion")
    expect(wrapper.get(".sablier-count").text()).toBe("1,401,600")
    expect(wrapper.text()).toContain("more than the lens can hold")
  })

  it("cannot zoom in past the finest grain", async () => {
    const wrapper = mountSablier()
    await zoomIn(wrapper)
    await zoomIn(wrapper)
    expect(
      wrapper.get('[aria-label="Zoom in"]').attributes("disabled")
    ).toBeDefined()
  })

  it("zooms back out without touching the stock count", async () => {
    const wrapper = mountSablier()
    await zoomIn(wrapper)
    await zoomOut(wrapper)
    expect(wrapper.get(".sablier-grain").text()).toBe("Le temps qui reste")
    expect(wrapper.get(".sablier-count").text()).toBe("1")
  })

  it("reads the horizon from inline args", () => {
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

describe("SablierInstrument play", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("ping-pongs the zoom on its own once played", async () => {
    const wrapper = mountSablier()
    await wrapper.get('[aria-label="Play"]').trigger("click")
    expect(wrapper.find('[aria-label="Pause"]').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(1400)
    expect(wrapper.get(".sablier-grain").text()).toBe("Un jour")
    await vi.advanceTimersByTimeAsync(1400)
    expect(wrapper.get(".sablier-grain").text()).toBe("Une émotion")
    // Reached the finest grain — it reverses instead of running off the end.
    await vi.advanceTimersByTimeAsync(1400)
    expect(wrapper.get(".sablier-grain").text()).toBe("Un jour")
  })

  it("stops when paused", async () => {
    const wrapper = mountSablier()
    await wrapper.get('[aria-label="Play"]').trigger("click")
    await wrapper.get('[aria-label="Pause"]').trigger("click")
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.get(".sablier-grain").text()).toBe("Le temps qui reste")
  })
})

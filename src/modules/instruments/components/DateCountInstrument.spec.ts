import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import DateCountInstrument from "@/modules/instruments/components/DateCountInstrument.vue"

const big = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get("div.font-mono").text()

describe("DateCountInstrument", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-26T12:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts days until a future date", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "2026-08-13", name: "until" }
    })
    expect(big(wrapper)).toBe("18 days")
    expect(wrapper.get("div.font-mono").classes()).toContain(
      "text-(--link-accent)"
    )
  })

  it("counts days since a past date with grouped thousands", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "2021-03-08", name: "since" }
    })
    expect(big(wrapper)).toBe("1 966 days")
  })

  it("uses the singular unit for a single day", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "2026-07-27", name: "until" }
    })
    expect(big(wrapper)).toBe("1 day")
  })

  it("shows today when the date is the current day", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "2026-07-26", name: "until" }
    })
    expect(big(wrapper)).toBe("today")
  })

  it("shows a muted ago message for an until date in the past", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "2026-07-20", name: "until" }
    })
    expect(big(wrapper)).toBe("6 days ago")
    const classes = wrapper.get("div.font-mono").classes()
    expect(classes).toContain("opacity-60")
    expect(classes).not.toContain("text-(--link-accent)")
  })

  it("renders the raw args and a hint for invalid input", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "soonish", name: "until" }
    })
    expect(wrapper.text()).toContain("soonish")
    expect(wrapper.text()).toContain("expected :::until YYYY-MM-DD:::")
    expect(wrapper.find("div.font-mono").exists()).toBe(false)
  })

  it("renders the label and target date in muted text", () => {
    const wrapper = mount(DateCountInstrument, {
      props: { args: "2026-08-13 Fin de la prépa", name: "until" }
    })
    expect(wrapper.text()).toContain("Fin de la prépa")
    expect(wrapper.text()).toContain("2026-08-13")
    expect(wrapper.get("div.text-sm").classes()).toContain("opacity-60")
  })
})

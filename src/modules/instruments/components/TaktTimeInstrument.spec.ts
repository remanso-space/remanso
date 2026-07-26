import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import TaktTimeInstrument from "@/modules/instruments/components/TaktTimeInstrument.vue"

const mountTakt = (args: string) =>
  mount(TaktTimeInstrument, { props: { args, name: "takt-time" } })

const result = (wrapper: ReturnType<typeof mountTakt>) =>
  wrapper.get("span.font-mono").text()

describe("TaktTimeInstrument", () => {
  it("parses args and shows the takt time", () => {
    const wrapper = mountTakt("22 / 480m")
    expect(result(wrapper)).toBe("21:49")
    expect(wrapper.text()).toContain("per unit")
    expect(wrapper.text()).toContain("22 / 480m")
  })

  it("updates the result when demand changes", async () => {
    const wrapper = mountTakt("22 / 480m")
    await wrapper.get('input[type="number"]').setValue(60)
    expect(result(wrapper)).toBe("08:00")
  })

  it("updates the result when the duration text changes", async () => {
    const wrapper = mountTakt("22 / 480m")
    await wrapper.get('input[type="text"]').setValue("440m")
    expect(result(wrapper)).toBe("20:00")
    expect(wrapper.text()).toContain("22 / 440m")
  })

  it("shows the inverse rate when mounted as takt", () => {
    const wrapper = mount(TaktTimeInstrument, {
      props: { args: "22 / 480m", name: "takt" }
    })
    expect(result(wrapper)).toBe("2.75")
    expect(wrapper.text()).toContain("units / hour")
    expect(wrapper.text()).not.toContain("per unit")
  })

  it("shows the rate for a one-hour window", () => {
    const wrapper = mount(TaktTimeInstrument, {
      props: { args: "4 / 1h", name: "takt" }
    })
    expect(result(wrapper)).toBe("4")
    expect(wrapper.text()).toContain("units / hour")
  })

  it("shows a hint for invalid args", () => {
    const wrapper = mountTakt("nonsense")
    expect(wrapper.find("span.font-mono").exists()).toBe(false)
    expect(wrapper.text()).toContain("expected :::takt-time 22 / 480m:::")
  })

  it("does not crash when the edited duration is invalid", async () => {
    const wrapper = mountTakt("22 / 480m")
    await wrapper.get('input[type="text"]').setValue("zzz")
    expect(wrapper.find("span.font-mono").exists()).toBe(false)
    expect(wrapper.text()).toContain("expected :::takt-time 22 / 480m:::")
    await wrapper.get('input[type="text"]').setValue("90s")
    expect(result(wrapper)).toBe("00:04")
  })
})

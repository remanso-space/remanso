import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import QuotaRatchetInstrument from "@/modules/instruments/components/QuotaRatchetInstrument.vue"

const mountRatchet = (args = "target=150 days=3") =>
  mount(QuotaRatchetInstrument, { props: { args, name: "quota-ratchet" } })

type Wrapper = ReturnType<typeof mountRatchet>

const clickButton = async (wrapper: Wrapper, label: string) => {
  const button = wrapper
    .findAll("button")
    .find((candidate) => candidate.text() === label)
  expect(button, `button "${label}"`).toBeDefined()
  await button?.trigger("click")
}

const logDay = async (wrapper: Wrapper, pounds: number) => {
  await wrapper.get('input[type="range"]').setValue(pounds)
  await clickButton(wrapper, "Log the day")
}

const lastRow = (wrapper: Wrapper) =>
  wrapper.findAll(".ratchet-log tbody tr").at(-1)?.text() ?? ""

describe("QuotaRatchetInstrument", () => {
  it("opens on day one at the target from the args", () => {
    const wrapper = mountRatchet()
    expect(wrapper.get(".ratchet-day").text()).toBe("Day 1 of 3")
    expect(wrapper.get(".ratchet-target").text()).toContain("150")
    expect(wrapper.get(".ratchet-picked").text()).toBe("150 lb")
  })

  it("raises the target when the day beats it", async () => {
    const wrapper = mountRatchet()
    await logDay(wrapper, 180)
    expect(wrapper.get(".ratchet-target").text()).toContain("180")
    expect(lastRow(wrapper)).toContain("target raised to 180")
  })

  it("counts lashes when the day falls short", async () => {
    const wrapper = mountRatchet()
    await logDay(wrapper, 130)
    expect(lastRow(wrapper)).toContain("20 lashes · no rations")
    expect(wrapper.get(".ratchet-target").text()).toContain("150")
  })

  it("keeps the raised target for the following day", async () => {
    const wrapper = mountRatchet()
    await logDay(wrapper, 180)
    await logDay(wrapper, 150)
    expect(lastRow(wrapper)).toContain("30 lashes")
  })

  it("closes on a ledger, not a verdict", async () => {
    const wrapper = mountRatchet("target=100 days=2")
    await logDay(wrapper, 120)
    await logDay(wrapper, 100)
    const summary = wrapper.get(".ratchet-summary").text()
    expect(summary).toContain("100")
    expect(summary).toContain("120")
    expect(summary).toContain("20 lashes")
    expect(summary).toContain("1 days without rations")
    expect(wrapper.find(".ratchet-day").exists()).toBe(false)
  })

  it("starts the log over", async () => {
    const wrapper = mountRatchet("target=100 days=1")
    await logDay(wrapper, 200)
    await clickButton(wrapper, "Again")
    expect(wrapper.get(".ratchet-day").text()).toBe("Day 1 of 1")
    expect(wrapper.get(".ratchet-target").text()).toContain("100")
    expect(wrapper.find(".ratchet-log").exists()).toBe(false)
  })
})

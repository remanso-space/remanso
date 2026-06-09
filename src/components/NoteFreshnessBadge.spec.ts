import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import NoteFreshnessBadge from "./NoteFreshnessBadge.vue"

const factory = (props: { status: string; lastCheckedAt?: Date | null }) =>
  mount(NoteFreshnessBadge, {
    props: { lastCheckedAt: null, ...props } as never
  })

describe("NoteFreshnessBadge", () => {
  it("renders the verified state with the cloud-check icon", () => {
    const wrapper = factory({ status: "verified" })
    expect(wrapper.classes()).toContain("state-verified")
    expect(wrapper.find(".icon-tabler-cloud-check").exists()).toBe(true)
  })

  it("renders the outdated state with the download icon", () => {
    const wrapper = factory({ status: "outdated" })
    expect(wrapper.classes()).toContain("state-outdated")
    expect(wrapper.find(".icon-tabler-cloud-download").exists()).toBe(true)
  })

  it("renders the offline state with the cloud-off icon", () => {
    const wrapper = factory({ status: "offline" })
    expect(wrapper.classes()).toContain("state-offline")
    expect(wrapper.find(".icon-tabler-cloud-off").exists()).toBe(true)
  })

  it("renders the unauthorized state with the lock icon", () => {
    const wrapper = factory({ status: "unauthorized" })
    expect(wrapper.classes()).toContain("state-unauthorized")
    expect(wrapper.find(".icon-tabler-cloud-lock").exists()).toBe(true)
  })

  it("disables the button while checking", () => {
    const wrapper = factory({ status: "checking" })
    expect(wrapper.attributes("disabled")).toBeDefined()
    expect(wrapper.find(".icon-tabler-loader-2").exists()).toBe(true)
  })

  it("emits click when not busy", async () => {
    const wrapper = factory({ status: "verified" })

    await wrapper.trigger("click")

    expect(wrapper.emitted("click")).toHaveLength(1)
  })

  it("includes the last-checked time in the verified tooltip", () => {
    const wrapper = factory({
      status: "verified",
      lastCheckedAt: new Date("2026-01-01T10:30:00")
    })
    const tooltip = wrapper.attributes("title") as string
    expect(tooltip).toMatch(/Verified at/)
  })

  it("renders the unknown state as default", () => {
    const wrapper = factory({ status: "unknown" })
    expect(wrapper.classes()).toContain("state-unknown")
    expect(wrapper.find(".icon-tabler-cloud-question").exists()).toBe(true)
  })

  it("offline tooltip prompts a retry", () => {
    const wrapper = factory({ status: "offline" })
    expect(wrapper.attributes("title")).toMatch(/retry/i)
  })

  it("unauthorized tooltip prompts a sign-in", () => {
    const wrapper = factory({ status: "unauthorized" })
    expect(wrapper.attributes("title")).toMatch(/[Ss]ign in/)
  })
})

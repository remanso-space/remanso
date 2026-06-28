import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import NoteState from "./NoteState.vue"

describe("NoteState", () => {
  it("shows a spinner while loading and no retry", () => {
    const wrapper = mount(NoteState, { props: { status: "loading" } })

    expect(wrapper.find(".loading-spinner").exists()).toBe(true)
    expect(wrapper.find(".note-state-retry").exists()).toBe(false)
  })

  it("shows a message and retry button when failed", () => {
    const wrapper = mount(NoteState, { props: { status: "failed" } })

    expect(wrapper.find(".loading-spinner").exists()).toBe(false)
    expect(wrapper.text()).toContain("Couldn't load this note")
    expect(wrapper.find(".note-state-retry").exists()).toBe(true)
  })

  it("emits retry when the retry button is clicked", async () => {
    const wrapper = mount(NoteState, { props: { status: "failed" } })

    await wrapper.find(".note-state-retry").trigger("click")

    expect(wrapper.emitted("retry")).toHaveLength(1)
  })
})

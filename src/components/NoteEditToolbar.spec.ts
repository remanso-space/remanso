import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import NoteEditToolbar from "@/components/NoteEditToolbar.vue"

const subject = (props: Partial<{ canAttachAudio: boolean; busy: boolean }>) =>
  mount(NoteEditToolbar, {
    props: { canAttachAudio: true, busy: false, ...props }
  })

/** Fires a change on a hidden input as though the user picked `file`. */
const pickFile = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, "files", { value: [file], configurable: true })
  input.dispatchEvent(new Event("change"))
}

describe("NoteEditToolbar", () => {
  it("offers image, audio and record when audio is available", () => {
    expect(subject({}).findAll("button")).toHaveLength(3)
  })

  // Audio only makes sense on a published note with an ATProto session; the
  // image button is the one that always applies.
  it("drops both audio actions when audio is unavailable", () => {
    const buttons = subject({ canAttachAudio: false }).findAll("button")

    expect(buttons).toHaveLength(1)
    expect(buttons[0].attributes("title")).toMatch(/image/i)
  })

  it("emits the picked image file", async () => {
    const wrapper = subject({})
    const file = new File(["x"], "cat.png", { type: "image/png" })

    pickFile(
      wrapper.find('input[accept="image/*"]').element as HTMLInputElement,
      file
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("image")?.[0]).toEqual([file])
  })

  it("emits the picked audio file", async () => {
    const wrapper = subject({})
    const file = new File(["x"], "take.m4a", { type: "audio/mp4" })

    pickFile(
      wrapper.find('input[accept="audio/*"]').element as HTMLInputElement,
      file
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("audio")?.[0]).toEqual([file])
  })

  // Without clearing, picking the same file twice fires no second change event.
  it("clears the input so the same file can be picked again", async () => {
    const wrapper = subject({})
    const input = wrapper.find('input[accept="image/*"]')
      .element as HTMLInputElement

    pickFile(input, new File(["x"], "cat.png", { type: "image/png" }))
    await wrapper.vm.$nextTick()

    expect(input.value).toBe("")
  })

  it("asks to open the recorder rather than emitting a file", async () => {
    const wrapper = subject({})

    await wrapper.findAll("button")[2].trigger("click")

    expect(wrapper.emitted("record")).toHaveLength(1)
  })

  it("disables every action while an upload is in flight", () => {
    const buttons = subject({ busy: true }).findAll("button")

    expect(buttons.every((b) => b.attributes("disabled") !== undefined)).toBe(
      true
    )
  })
})

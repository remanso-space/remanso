import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import SharePublicNote from "./SharePublicNote.vue"

const writeText = vi.fn(() => Promise.resolve())

vi.mock("@/utils/notif", () => ({
  confirmMessage: vi.fn(),
  errorMessage: vi.fn()
}))

const mountAt = async (path: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/notes/:shortDid/:rkey/:slug?",
        name: "PublicNoteView",
        component: { template: "<div />" }
      }
    ]
  })

  await router.push(path)
  await router.isReady()

  return mount(SharePublicNote, { global: { plugins: [router] } })
}

describe("SharePublicNote", () => {
  beforeEach(async () => {
    const notif = await import("@/utils/notif")
    vi.mocked(notif.confirmMessage).mockClear()
    vi.mocked(notif.errorMessage).mockClear()
    writeText.mockClear()
    Object.assign(navigator, { clipboard: { writeText } })
  })

  it("copies an absolute link to the note", async () => {
    const { confirmMessage, errorMessage } = await import("@/utils/notif")
    const wrapper = await mountAt("/notes/abc/xyz/my-note")

    await wrapper.find("button").trigger("click")

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/notes/abc/xyz/my-note`
    )
    await vi.waitFor(() => expect(confirmMessage).toHaveBeenCalled())
    expect(errorMessage).not.toHaveBeenCalled()
  })

  it("keeps the stacked notes, so the reader lands on the same view", async () => {
    const wrapper = await mountAt("/notes/abc/xyz?stackedNotes=def-uvw")

    await wrapper.find("button").trigger("click")

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/notes/abc/xyz?stackedNotes=def-uvw`
    )
  })

  it("reports a failed copy instead of looking like it worked", async () => {
    const { errorMessage } = await import("@/utils/notif")
    writeText.mockRejectedValueOnce(new Error("denied"))

    const wrapper = await mountAt("/notes/abc/xyz")
    await wrapper.find("button").trigger("click")
    await vi.waitFor(() => expect(errorMessage).toHaveBeenCalled())
  })
})

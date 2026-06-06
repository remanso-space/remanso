import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"

const push = vi.fn()
vi.mock("vue-router", () => ({
  useRouter: () => ({ push })
}))

import { useForm } from "./useForm.hook"

const host = () => {
  let api!: ReturnType<typeof useForm>
  mount(
    defineComponent({
      template: "<div/>",
      setup() {
        api = useForm()
        return api
      }
    })
  )
  return api
}

describe("useForm", () => {
  beforeEach(() => {
    push.mockReset()
  })

  it("starts with empty user and repo inputs", () => {
    const api = host()
    expect(api.userInput.value).toBe("")
    expect(api.repoInput.value).toBe("")
  })

  it("submit is a no-op when userInput is empty", () => {
    const api = host()
    api.repoInput.value = "notes"

    api.submit()

    expect(push).not.toHaveBeenCalled()
  })

  it("submit is a no-op when repoInput is empty", () => {
    const api = host()
    api.userInput.value = "alice"

    api.submit()

    expect(push).not.toHaveBeenCalled()
  })

  it("submit pushes the FluxNoteView route with user/repo params", () => {
    const api = host()
    api.userInput.value = "alice"
    api.repoInput.value = "notes"

    api.submit()

    expect(push).toHaveBeenCalledWith({
      name: "FluxNoteView",
      params: { user: "alice", repo: "notes" }
    })
  })
})

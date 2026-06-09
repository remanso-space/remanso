import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent, ref } from "vue"

const escape = ref(false)
vi.mock("@vueuse/core", () => ({
  useMagicKeys: () => ({ escape })
}))

import { useEditionMode } from "./useEditionMode"

const host = (slot: (api: ReturnType<typeof useEditionMode>) => void) =>
  mount(
    defineComponent({
      template: "<div/>",
      setup() {
        const api = useEditionMode()
        slot(api)
        return api
      }
    })
  )

describe("useEditionMode", () => {
  afterEach(() => {
    escape.value = false
  })

  it("starts in read mode", () => {
    let mode: unknown
    host((api) => {
      mode = api.mode.value
    })
    expect(mode).toBe("read")
  })

  it("toggleMode flips read ↔ edit", () => {
    let api: ReturnType<typeof useEditionMode> | undefined
    host((a) => {
      api = a
    })

    api!.toggleMode()
    expect(api!.mode.value).toBe("edit")

    api!.toggleMode()
    expect(api!.mode.value).toBe("read")
  })

  it("escape key exits edit mode", async () => {
    let api: ReturnType<typeof useEditionMode> | undefined
    host((a) => {
      a.toggleMode()
      api = a
    })

    expect(api!.mode.value).toBe("edit")

    escape.value = true
    await new Promise((r) => setTimeout(r, 0))

    expect(api!.mode.value).toBe("read")
  })

  it("escape key is a no-op when already in read mode", async () => {
    let api: ReturnType<typeof useEditionMode> | undefined
    host((a) => {
      api = a
    })

    escape.value = true
    await new Promise((r) => setTimeout(r, 0))

    expect(api!.mode.value).toBe("read")
  })
})

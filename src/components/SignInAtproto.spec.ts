import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  configureAtprotoLogin,
  memoryStorageSession,
  resetAtprotoLogin,
  resetAtprotoLoginState,
  resetOAuthClient
} from "vue-atproto-login"

const init = vi.fn()

vi.mock("@atproto/oauth-client-browser", () => ({
  BrowserOAuthClient: {
    load: async () => ({
      init,
      signInRedirect: vi.fn(),
      revoke: vi.fn(),
      restore: vi.fn(),
      addEventListener: vi.fn()
    })
  },
  buildLoopbackClientId: () => "http://localhost"
}))

import SignInAtproto from "./SignInAtproto.vue"

beforeEach(() => {
  vi.clearAllMocks()
  resetAtprotoLogin()
  resetAtprotoLoginState()
  resetOAuthClient()
  init.mockResolvedValue(undefined)
  configureAtprotoLogin({
    clientId: "https://remanso.space/client-metadata.json",
    dev: false,
    storage: memoryStorageSession(),
    resolveProfile: async (did) => ({
      did,
      handle: "alice.bsky.social",
      avatar: "avatar.png"
    }),
    searchActors: async () => [
      { did: "did:plc:bob", handle: "bob.bsky.social", displayName: "Bob" }
    ]
  })
})

const typeAndDebounce = async (
  wrapper: ReturnType<typeof mount>,
  value: string
) => {
  await wrapper.find("input").setValue(value)
  await new Promise((resolve) => setTimeout(resolve, 250))
  await flushPromises()
}

describe("SignInAtproto", () => {
  it("dresses the box in daisyUI and lets no package class through", async () => {
    const wrapper = mount(SignInAtproto)
    await flushPromises()

    expect(wrapper.find("input").classes()).toEqual([
      "input",
      "input-sm",
      "join-item"
    ])
    expect(wrapper.find(".join").exists()).toBe(true)
    // The box sits inside #main-app.prose, which would otherwise give the avatar
    // a 2em margin and the rows list markers.
    expect(wrapper.find(".sign-in-atproto").classes()).toContain("not-prose")

    const everyClass = wrapper.findAll("[class]").flatMap((el) => el.classes())
    expect(everyClass.filter((name) => name.startsWith("atp-"))).toEqual([])
  })

  it("shows the handle and avatar once signed in", async () => {
    init.mockResolvedValue({ session: { did: "did:plc:alice" } })
    const wrapper = mount(SignInAtproto)
    await flushPromises()

    expect(wrapper.text()).toContain("alice.bsky.social")
    expect(wrapper.find("img.sign-in-atproto-avatar").attributes("src")).toBe(
      "avatar.png"
    )
    expect(wrapper.find(".btn").text()).toBe("Sign out")
  })

  it("hides sign-out when the profile modal is not the caller", async () => {
    init.mockResolvedValue({ session: { did: "did:plc:alice" } })
    const wrapper = mount(SignInAtproto, { props: { withSignOut: false } })
    await flushPromises()

    expect(wrapper.text()).toContain("alice.bsky.social")
    expect(wrapper.find("button").exists()).toBe(false)
  })

  it("renders suggestion rows from our own markup, highlight included", async () => {
    const wrapper = mount(SignInAtproto)
    await flushPromises()
    await typeAndDebounce(wrapper, "bo")

    const row = wrapper.find('[role="option"] .sign-in-atproto-suggestion')
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain("bob.bsky.social")
    expect(row.text()).toContain("Bob")
    expect(row.classes()).not.toContain("is-active")

    // Arrow-down highlights the first row, which is what paints --link-accent.
    await wrapper.find("input").trigger("keydown.down")
    expect(
      wrapper.find('[role="option"] .sign-in-atproto-suggestion').classes()
    ).toContain("is-active")
  })
})

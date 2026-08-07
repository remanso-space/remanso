import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"

const ghAccessToken = ref<string | null>(null)
const ghUsername = ref<string | null>(null)
const atIsLoggedIn = ref(false)
const atHandle = ref<string | null>(null)
const atAvatarUrl = ref<string | null>(null)

vi.mock("@/hooks/useGitHubLogin.hook", () => ({
  useGitHubLogin: () => ({
    username: ghUsername,
    accessToken: ghAccessToken
  })
}))

vi.mock("vue-atproto-login", () => ({
  useAtprotoLogin: () => ({
    isLoggedIn: atIsLoggedIn,
    handle: atHandle,
    avatar: atAvatarUrl
  })
}))

import UserPill from "./UserPill.vue"

describe("UserPill", () => {
  beforeEach(() => {
    ghAccessToken.value = null
    ghUsername.value = null
    atIsLoggedIn.value = false
    atHandle.value = null
    atAvatarUrl.value = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("shows the ghost 'Sign in' pill when nobody is logged in", () => {
    const wrapper = mount(UserPill)
    expect(wrapper.text()).toContain("Sign in")
    expect(wrapper.classes()).toContain("profile-chip--ghost")
  })

  it("shows the GitHub username and initial when logged in via GitHub only", () => {
    ghAccessToken.value = "tok"
    ghUsername.value = "alice"

    const wrapper = mount(UserPill)

    expect(wrapper.text()).toContain("alice")
    expect(wrapper.find(".profile-avatar-initial").text()).toBe("A")
    expect(wrapper.find("img").exists()).toBe(false)
    expect(wrapper.classes()).not.toContain("profile-chip--ghost")
  })

  it("shows the ATProto handle and avatar when logged in via ATProto", () => {
    atIsLoggedIn.value = true
    atHandle.value = "alice.bsky.social"
    atAvatarUrl.value = "https://cdn.example.com/avatar.jpg"

    const wrapper = mount(UserPill)

    expect(wrapper.text()).toContain("alice.bsky.social")
    const img = wrapper.find("img")
    expect(img.exists()).toBe(true)
    expect(img.attributes("src")).toBe("https://cdn.example.com/avatar.jpg")
  })

  it("prefers the ATProto handle over the GitHub username when both are present", () => {
    ghAccessToken.value = "tok"
    ghUsername.value = "alice-gh"
    atIsLoggedIn.value = true
    atHandle.value = "alice.bsky.social"

    const wrapper = mount(UserPill)

    expect(wrapper.text()).toContain("alice.bsky.social")
    expect(wrapper.text()).not.toContain("alice-gh")
  })

  it("falls back to '?' initial when no name is available but a user is logged in", () => {
    atIsLoggedIn.value = true
    atHandle.value = ""

    const wrapper = mount(UserPill)

    expect(wrapper.find(".profile-avatar-initial").text()).toBe("?")
  })

  it("emits click when clicked", async () => {
    const wrapper = mount(UserPill)
    await wrapper.trigger("click")
    expect(wrapper.emitted("click")).toHaveLength(1)
  })
})

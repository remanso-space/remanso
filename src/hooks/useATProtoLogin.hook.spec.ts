import { beforeEach, describe, expect, it, vi } from "vitest"

import { getAuthor } from "@/modules/atproto/getAuthor"
import { restoreSession } from "@/modules/atproto/service/atprotoOAuth"
import {
  clearSession,
  loadSession,
  saveSession
} from "@/modules/atproto/service/atprotoSession"

vi.mock("@/modules/atproto/service/atprotoOAuth", () => ({
  restoreSession: vi.fn(),
  sdkSignOut: vi.fn(),
  signInWithHandle: vi.fn()
}))
vi.mock("@/modules/atproto/service/atprotoSession", () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn()
}))
vi.mock("@/modules/atproto/getAuthor", () => ({
  getAuthor: vi.fn()
}))

const CACHED = { did: "did:plc:abc", handle: "jean.example" }

// The hook keeps module-level state behind a one-shot `init` flag, so each
// case needs a fresh module registry.
const freshHook = async () => {
  vi.resetModules()
  const mod = await import("@/hooks/useATProtoLogin.hook")
  return mod.useATProtoLogin()
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("useATProtoLogin", () => {
  beforeEach(() => {
    vi.mocked(loadSession).mockReset()
    vi.mocked(saveSession).mockReset()
    vi.mocked(clearSession).mockReset()
    vi.mocked(restoreSession).mockReset()
    vi.mocked(getAuthor).mockReset()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response))
  })

  it("keeps the restored session", async () => {
    vi.mocked(loadSession).mockResolvedValue(null)
    vi.mocked(restoreSession).mockResolvedValue({ did: CACHED.did } as never)
    vi.mocked(getAuthor).mockResolvedValue({
      handle: CACHED.handle,
      pds: "https://eurosky.social"
    })

    const { did, isLoggedIn } = await freshHook()
    await settle()

    expect(did.value).toBe(CACHED.did)
    expect(isLoggedIn.value).toBe(true)
  })

  // Regression: the cached DID used to survive a dead OAuth grant, leaving
  // isLoggedIn true. The attach-audio button showed and every upload failed
  // with "ATProto session expired".
  it("drops the cached identity when the OAuth grant is gone", async () => {
    vi.mocked(loadSession).mockResolvedValue(CACHED as never)
    vi.mocked(restoreSession).mockResolvedValue(null)

    const { did, isLoggedIn } = await freshHook()
    await settle()

    expect(clearSession).toHaveBeenCalled()
    expect(did.value).toBe("")
    expect(isLoggedIn.value).toBe(false)
  })

  // Offline must not look like a sign-out: a throw is transport, not a
  // revoked grant.
  it("keeps the cached identity when the restore call throws", async () => {
    vi.mocked(loadSession).mockResolvedValue(CACHED as never)
    vi.mocked(restoreSession).mockRejectedValue(new Error("Failed to fetch"))

    const { did, isLoggedIn } = await freshHook()
    await settle()

    expect(clearSession).not.toHaveBeenCalled()
    expect(did.value).toBe(CACHED.did)
    expect(isLoggedIn.value).toBe(true)
  })

  it("does not clear anything when there was no cached session", async () => {
    vi.mocked(loadSession).mockResolvedValue(null)
    vi.mocked(restoreSession).mockResolvedValue(null)

    const { isLoggedIn } = await freshHook()
    await settle()

    expect(clearSession).not.toHaveBeenCalled()
    expect(isLoggedIn.value).toBe(false)
  })
})

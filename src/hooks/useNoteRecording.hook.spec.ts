import { beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, type MaybeRefOrGetter, ref } from "vue"

import { useNoteRecording } from "@/hooks/useNoteRecording.hook"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

vi.mock("@/modules/atproto/resolveRecording", () => ({
  resolveRecording: vi.fn()
}))

const RECORDING = {
  blobUrl: "https://eurosky.social/xrpc/com.atproto.sync.getBlob?did=x",
  title: "Stream du 12 mai",
  durationSec: 3600
}

/** Runs the hook inside a scope so the async watcher is stopped on teardown. */
const subject = (did: string, rkey: MaybeRefOrGetter<string>) => {
  const scope = effectScope()
  const result = scope.run(() => useNoteRecording(did, rkey))!
  return { ...result, dispose: () => scope.stop() }
}

describe("useNoteRecording", () => {
  beforeEach(() => {
    vi.mocked(resolveRecording).mockReset()
    vi.mocked(resolveRecording).mockResolvedValue(null)
  })

  it("resolves the recording sharing the note's rkey", async () => {
    vi.mocked(resolveRecording).mockResolvedValue(RECORDING)

    const { atUri, recording } = subject("did:plc:abc", "3xyz")

    expect(atUri.value).toBe("at://did:plc:abc/space.remanso.recording/3xyz")
    expect(resolveRecording).toHaveBeenCalledWith(atUri.value)
    await vi.waitFor(() => expect(recording.value).toEqual(RECORDING))
  })

  it("stays null when the note has no recording", async () => {
    // The 404 case, which is most notes: resolveRecording swallows it.
    const { recording } = subject("did:plc:abc", "3xyz")

    await vi.waitFor(() => expect(resolveRecording).toHaveBeenCalled())
    expect(recording.value).toBeNull()
  })

  it("re-resolves when the route moves to another note", async () => {
    const rkey = ref("3xyz")
    const { atUri, recording } = subject("did:plc:abc", rkey)
    await vi.waitFor(() => expect(resolveRecording).toHaveBeenCalledTimes(1))

    vi.mocked(resolveRecording).mockResolvedValue(RECORDING)
    rkey.value = "3abc"

    expect(atUri.value).toBe("at://did:plc:abc/space.remanso.recording/3abc")
    await vi.waitFor(() => expect(recording.value).toEqual(RECORDING))
  })
})

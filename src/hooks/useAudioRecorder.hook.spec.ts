import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope } from "vue"

import { pickMimeType, useAudioRecorder } from "@/hooks/useAudioRecorder.hook"

class FakeMediaRecorder {
  static supported: string[] = []
  static last: FakeMediaRecorder | null = null
  static isTypeSupported = (type: string) =>
    FakeMediaRecorder.supported.includes(type)

  state: "inactive" | "recording" | "paused" = "inactive"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  timeslice: number | undefined

  constructor(
    public stream: unknown,
    public options: { mimeType: string; audioBitsPerSecond?: number }
  ) {
    FakeMediaRecorder.last = this
  }

  start(timeslice?: number) {
    this.timeslice = timeslice
    this.state = "recording"
  }
  pause() {
    this.state = "paused"
  }
  resume() {
    this.state = "recording"
  }
  stop() {
    this.state = "inactive"
    this.ondataavailable?.({
      data: new Blob(["chunk"], { type: this.options.mimeType })
    })
    this.onstop?.()
  }
}

const stoppedTracks: string[] = []

const fakeStream = () => ({
  getTracks: () => [{ stop: () => stoppedTracks.push("track") }]
})

const getUserMedia = vi.fn()

/** Runs the hook inside a scope so onScopeDispose is exercised on teardown. */
const mount = () => {
  const scope = effectScope()
  const recorder = scope.run(() => useAudioRecorder())!
  return { recorder, dispose: () => scope.stop() }
}

describe("useAudioRecorder", () => {
  beforeEach(() => {
    stoppedTracks.length = 0
    FakeMediaRecorder.last = null
    FakeMediaRecorder.supported = ["audio/webm;codecs=opus", "audio/webm"]
    getUserMedia.mockReset()
    getUserMedia.mockResolvedValue(fakeStream())

    vi.stubGlobal("MediaRecorder", FakeMediaRecorder)
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } })
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:take",
      revokeObjectURL: vi.fn()
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("pickMimeType", () => {
    it("prefers mp4 so the take plays on every browser", () => {
      FakeMediaRecorder.supported = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/mp4;codecs=mp4a.40.2"
      ]
      expect(pickMimeType()).toBe("audio/mp4;codecs=mp4a.40.2")
    })

    it("falls back to webm/opus when mp4 is unavailable", () => {
      FakeMediaRecorder.supported = ["audio/webm;codecs=opus", "audio/webm"]
      expect(pickMimeType()).toBe("audio/webm;codecs=opus")
    })

    it("returns null when the browser encodes none of them", () => {
      FakeMediaRecorder.supported = []
      expect(pickMimeType()).toBeNull()
    })

    it("returns null when MediaRecorder is missing", () => {
      vi.stubGlobal("MediaRecorder", undefined)
      expect(pickMimeType()).toBeNull()
    })
  })

  it("records and produces a File the upload path accepts", async () => {
    const { recorder, dispose } = mount()

    expect(await recorder.start()).toBe(true)
    expect(recorder.state.value).toBe("recording")
    // A timeslice keeps chunks flowing rather than buffering the whole take.
    expect(FakeMediaRecorder.last?.timeslice).toBe(1000)

    recorder.stop()

    expect(recorder.state.value).toBe("ready")
    const take = recorder.take.value!
    expect(take).toBeInstanceOf(File)
    // useAudioUpload gates on an `audio/` prefix, and the codecs parameter has
    // no business in an upload Content-Type.
    expect(take.type).toBe("audio/webm")
    expect(take.name).toBe("recording.weba")
    expect(recorder.previewUrl.value).toBe("blob:take")

    dispose()
  })

  it("names an mp4 take .m4a", async () => {
    FakeMediaRecorder.supported = ["audio/mp4;codecs=mp4a.40.2"]
    const { recorder, dispose } = mount()

    await recorder.start()
    recorder.stop()

    expect(recorder.take.value?.name).toBe("recording.m4a")
    expect(recorder.take.value?.type).toBe("audio/mp4")

    dispose()
  })

  it("releases the microphone once the take is done", async () => {
    const { recorder, dispose } = mount()

    await recorder.start()
    expect(stoppedTracks).toHaveLength(0)

    recorder.stop()
    expect(stoppedTracks).toHaveLength(1)

    dispose()
  })

  it("pauses and resumes without ending the take", async () => {
    const { recorder, dispose } = mount()

    await recorder.start()
    recorder.pause()
    expect(recorder.state.value).toBe("paused")
    expect(FakeMediaRecorder.last?.state).toBe("paused")

    recorder.resume()
    expect(recorder.state.value).toBe("recording")

    recorder.stop()
    expect(recorder.state.value).toBe("ready")

    dispose()
  })

  it("reports a refused permission prompt separately from an unusable mic", async () => {
    const denied = new Error("denied")
    denied.name = "NotAllowedError"
    getUserMedia.mockRejectedValueOnce(denied)

    const { recorder, dispose } = mount()
    expect(await recorder.start()).toBe(false)
    expect(recorder.state.value).toBe("denied")
    dispose()

    const missing = new Error("no device")
    missing.name = "NotFoundError"
    getUserMedia.mockRejectedValueOnce(missing)

    const second = mount()
    expect(await second.recorder.start()).toBe(false)
    expect(second.recorder.state.value).toBe("unsupported")
    second.dispose()
  })

  it("refuses to start when no container is supported", async () => {
    FakeMediaRecorder.supported = []
    const { recorder, dispose } = mount()

    expect(await recorder.start()).toBe(false)
    expect(recorder.state.value).toBe("unsupported")
    expect(getUserMedia).not.toHaveBeenCalled()

    dispose()
  })

  it("discards the take on reset and stops the mic", async () => {
    const { recorder, dispose } = mount()

    await recorder.start()
    recorder.reset()

    expect(recorder.state.value).toBe("idle")
    expect(recorder.take.value).toBeNull()
    expect(recorder.previewUrl.value).toBeNull()
    expect(recorder.elapsedSec.value).toBe(0)
    expect(stoppedTracks).toHaveLength(1)

    dispose()
  })

  it("guards against navigating away mid-take", async () => {
    const add = vi.spyOn(window, "addEventListener")
    const remove = vi.spyOn(window, "removeEventListener")

    const { recorder, dispose } = mount()
    await recorder.start()
    await Promise.resolve()

    expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function))

    recorder.stop()
    await Promise.resolve()

    expect(remove).toHaveBeenCalledWith("beforeunload", expect.any(Function))

    dispose()
    add.mockRestore()
    remove.mockRestore()
  })

  it("stops the mic when the owning scope goes away", async () => {
    const { recorder, dispose } = mount()

    await recorder.start()
    dispose()

    expect(stoppedTracks).toHaveLength(1)
  })
})

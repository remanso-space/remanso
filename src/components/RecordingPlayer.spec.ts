import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import RecordingPlayer from "./RecordingPlayer.vue"

const URI = "at://did:plc:abc/space.remanso.recording/3xyz"

const BLOB_URL = "https://eurosky.social/xrpc/com.atproto.sync.getBlob?did=x"

describe("RecordingPlayer", () => {
  it("renders an audio element with the resolved blob URL", () => {
    const wrapper = mount(RecordingPlayer, {
      props: {
        atUri: URI,
        alt: "Ma 間 - audio",
        recording: {
          blobUrl: "https://eurosky.social/xrpc/com.atproto.sync.getBlob?did=x",
          title: "Stream du 12 mai",
          durationSec: 3661
        }
      }
    })

    const audio = wrapper.find("audio")
    expect(audio.exists()).toBe(true)
    expect(audio.attributes("src")).toContain("com.atproto.sync.getBlob")
    expect(wrapper.text()).toContain("Stream du 12 mai")
  })

  it("formats the duration as h:mm:ss", () => {
    const wrapper = mount(RecordingPlayer, {
      props: {
        atUri: URI,
        alt: "Ma 間 - audio",
        recording: { blobUrl: "https://x/blob", durationSec: 3661 }
      }
    })

    expect(wrapper.text()).toContain("1:01:01")
  })

  it("formats a sub-hour duration as m:ss", () => {
    const wrapper = mount(RecordingPlayer, {
      props: {
        atUri: URI,
        alt: "Ma 間 - audio",
        recording: { blobUrl: "https://x/blob", durationSec: 125 }
      }
    })

    expect(wrapper.text()).toContain("2:05")
  })

  it("falls back to the alt text as a link when resolution failed", () => {
    const wrapper = mount(RecordingPlayer, {
      props: { atUri: URI, alt: "Ma 間 - audio", recording: null }
    })

    expect(wrapper.find("audio").exists()).toBe(false)
    const link = wrapper.find("a")
    expect(link.attributes("href")).toBe(URI)
    expect(link.text()).toBe("Ma 間 - audio")
  })

  it("uses the alt text when the record carries no title", () => {
    const wrapper = mount(RecordingPlayer, {
      props: {
        atUri: URI,
        alt: "Ma 間 - audio",
        recording: { blobUrl: "https://x/blob" }
      }
    })

    expect(wrapper.text()).toContain("Ma 間 - audio")
  })

  /**
   * The PDS answers a `Range: bytes=N-` with 200 and the whole body from byte
   * zero, and Safari plays the bytes at the offset it asked for — so the
   * element must never be the one fetching the audio.
   */
  describe("local copy", () => {
    const play = vi.fn()
    const pause = vi.fn()
    const createObjectURL = vi.fn(() => "blob:local-copy")
    const revokeObjectURL = vi.fn()

    beforeEach(() => {
      play.mockReset().mockResolvedValue(undefined)
      pause.mockReset()
      createObjectURL.mockClear()
      revokeObjectURL.mockClear()

      vi.stubGlobal("fetch", vi.fn())
      HTMLMediaElement.prototype.play = play
      HTMLMediaElement.prototype.pause = pause
      URL.createObjectURL = createObjectURL
      URL.revokeObjectURL = revokeObjectURL
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    const mountPlayer = () =>
      mount(RecordingPlayer, {
        props: {
          atUri: URI,
          alt: "Ma 間 - audio",
          recording: { blobUrl: BLOB_URL, durationSec: 53 }
        },
        attachTo: document.body
      })

    it("asks for nothing before the reader presses play", () => {
      const audio = mountPlayer().find("audio")

      expect(audio.attributes("preload")).toBe("none")
      expect(fetch).not.toHaveBeenCalled()
    })

    it("swaps in a downloaded copy on the first play", async () => {
      const blob = new Blob(["audio"], { type: "audio/webm" })
      vi.mocked(fetch).mockResolvedValue(
        new Response(blob, { status: 200 }) as never
      )

      const wrapper = mountPlayer()
      const audio = wrapper.find("audio")
      await audio.trigger("play")
      await flushPromises()

      expect(fetch).toHaveBeenCalledWith(BLOB_URL)
      expect(pause).toHaveBeenCalled()
      expect(audio.attributes("src")).toBe("blob:local-copy")
      expect(play).toHaveBeenCalled()
    })

    /**
     * Calling play() before Vue has patched the src attribute restarts the load
     * on the old URL and leaves the element paused — the reader has to press
     * play a second time.
     */
    it("resumes only once the element carries the local copy", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(new Blob(["a"])) as never)

      let srcAtPlay: string | null = null
      play.mockImplementation(function (this: HTMLAudioElement) {
        srcAtPlay = this.getAttribute("src")
        return Promise.resolve()
      })

      const audio = mountPlayer().find("audio")
      await audio.trigger("play")
      await flushPromises()

      expect(srcAtPlay).toBe("blob:local-copy")
    })

    it("downloads once however often playback restarts", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(new Blob(["a"])) as never)

      const audio = mountPlayer().find("audio")
      await audio.trigger("play")
      await flushPromises()
      await audio.trigger("play")
      await flushPromises()

      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it("keeps the remote URL when the download fails", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("offline"))

      const audio = mountPlayer().find("audio")
      await audio.trigger("play")
      await flushPromises()

      expect(audio.attributes("src")).toBe(BLOB_URL)
      expect(play).toHaveBeenCalled()
    })

    it("releases the copy when the player goes away", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(new Blob(["a"])) as never)

      const wrapper = mountPlayer()
      await wrapper.find("audio").trigger("play")
      await flushPromises()
      wrapper.unmount()

      expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-copy")
    })
  })
})

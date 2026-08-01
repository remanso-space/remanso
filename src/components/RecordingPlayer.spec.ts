import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import RecordingPlayer from "./RecordingPlayer.vue"

const URI = "at://did:plc:abc/space.remanso.recording/3xyz"

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
})

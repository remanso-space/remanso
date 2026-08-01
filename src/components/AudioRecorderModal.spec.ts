import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, ref, shallowRef } from "vue"

import AudioRecorderModal from "@/components/AudioRecorderModal.vue"

const state = ref<string>("idle")

const recorder = {
  state,
  elapsedSec: ref(0),
  previewUrl: ref<string | null>(null),
  take: shallowRef<File | null>(null),
  levels: ref<number[]>([]),
  devices: ref<{ deviceId: string; label: string }[]>([]),
  deviceId: ref(""),
  isCapturing: computed(
    () => state.value === "recording" || state.value === "paused"
  ),
  selectDevice: vi.fn(),
  refreshDevices: vi.fn().mockResolvedValue(undefined),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  reset: vi.fn()
}

vi.mock("@/hooks/useAudioRecorder.hook", () => ({
  MAX_RECORDING_SEC: 3600,
  LEVEL_BARS: 48,
  useAudioRecorder: () => recorder
}))

const subject = () => mount(AudioRecorderModal, { props: { open: true } })

const buttonNamed = (
  wrapper: ReturnType<typeof subject>,
  label: string | RegExp
) =>
  wrapper
    .findAll("button")
    .find((button) =>
      typeof label === "string"
        ? button.text() === label
        : label.test(button.text())
    )!

/** Puts the recorder in the state where a take exists and can be lost. */
const withTake = () => {
  state.value = "ready"
  recorder.elapsedSec.value = 754
  recorder.previewUrl.value = "blob:take"
  recorder.take.value = new File(["x"], "recording.weba", {
    type: "audio/webm"
  })
}

describe("AudioRecorderModal", () => {
  beforeEach(() => {
    state.value = "idle"
    recorder.elapsedSec.value = 0
    recorder.previewUrl.value = null
    recorder.take.value = null
    recorder.reset.mockReset()
  })

  // The chunks never touch disk, so a mis-tap on a button next to "Attach"
  // costs the whole recording.
  describe("discarding a finished take", () => {
    it("asks before re-recording over a take", async () => {
      withTake()
      const wrapper = subject()

      await buttonNamed(wrapper, "Record again").trigger("click")

      expect(recorder.reset).not.toHaveBeenCalled()
      expect(wrapper.text()).toMatch(/Discard this 12:34 recording\?/)
    })

    it("keeps the take when the confirmation is declined", async () => {
      withTake()
      const wrapper = subject()

      await buttonNamed(wrapper, "Record again").trigger("click")
      await buttonNamed(wrapper, "Keep it").trigger("click")

      expect(recorder.reset).not.toHaveBeenCalled()
      expect(wrapper.text()).not.toMatch(/Discard this/)
      expect(buttonNamed(wrapper, "Attach to note").exists()).toBe(true)
    })

    it("only discards once the confirmation is accepted", async () => {
      withTake()
      const wrapper = subject()

      await buttonNamed(wrapper, "Record again").trigger("click")
      await buttonNamed(wrapper, "Discard").trigger("click")

      expect(recorder.reset).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted("update:open")).toBeUndefined()
    })

    it("asks before closing on a take, and stays open until confirmed", async () => {
      withTake()
      const wrapper = subject()

      await buttonNamed(wrapper, "Discard").trigger("click")

      expect(recorder.reset).not.toHaveBeenCalled()
      expect(wrapper.emitted("update:open")).toBeUndefined()

      await buttonNamed(wrapper, "Discard").trigger("click")

      expect(recorder.reset).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted("update:open")?.[0]).toEqual([false])
    })

    // Escape and the backdrop destroyed the take with no gesture at all.
    it("routes an Escape through the same confirmation", async () => {
      withTake()
      const wrapper = subject()

      await wrapper.find("dialog").trigger("cancel")

      expect(recorder.reset).not.toHaveBeenCalled()
      expect(wrapper.text()).toMatch(/Discard this/)
    })
  })

  it("closes without ceremony when there is nothing recorded", async () => {
    const wrapper = subject()

    await buttonNamed(wrapper, "Close").trigger("click")

    expect(wrapper.text()).not.toMatch(/Discard this/)
    expect(wrapper.emitted("update:open")?.[0]).toEqual([false])
  })

  it("separates the attach action from the two that destroy the take", () => {
    withTake()
    const labels = subject()
      .findAll(".modal-action button")
      .map((button) => button.text())

    // Attach sits last, pushed to the far side by .attach { margin-left: auto }.
    expect(labels).toEqual(["Discard", "Record again", "Attach to note"])
  })
})

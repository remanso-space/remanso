import { createApp } from "vue"

import { resolveRecording } from "@/modules/atproto/resolveRecording"

/**
 * Mount a RecordingPlayer onto every recording placeholder in scope.
 *
 * Resolution is a network hop per placeholder, so the component only loads
 * when a note actually carries a recording. A failed resolve still mounts —
 * the player renders its alt-text fallback rather than leaving an empty div.
 */
export const runRecordings = async (querySelector: string): Promise<void> => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(querySelector)
  ).filter((el) => !el.dataset.recordingRendered)
  if (elements.length === 0) return

  const { default: RecordingPlayer } = await import(
    "@/components/RecordingPlayer.vue"
  )

  await Promise.all(
    elements.map(async (el) => {
      el.dataset.recordingRendered = "pending"

      const atUri = el.dataset.atUri
      if (!atUri) {
        el.dataset.recordingRendered = "error"
        return
      }

      const recording = await resolveRecording(atUri)

      el.textContent = ""
      createApp(RecordingPlayer, {
        atUri,
        alt: el.dataset.alt ?? "",
        recording
      }).mount(el)
      el.dataset.recordingRendered = "true"
    })
  )
}

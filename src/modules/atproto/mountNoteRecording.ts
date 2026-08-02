import { createApp } from "vue"

import { resolveRecording } from "@/modules/atproto/resolveRecording"

/**
 * Mount the note's own recording — the one sharing its rkey — under the note's
 * title.
 *
 * The public views place this slot in the template, between the `title` field
 * and the `<article>`. A local `.pub.md` has no separate title field: its `#
 * Title` is the first line of the body and renders inside the same HTML blob,
 * so the only way to land under it is to put the slot there after the render.
 *
 * Idempotent per render: the slot carries its own class, and a second pass
 * over the same DOM finds it and stops. A re-render replaces the container's
 * innerHTML, which takes the slot with it, and the next pass mounts it again.
 */
export const mountNoteRecording = async (
  containerSelector: string,
  atUri: string,
  alt: string
): Promise<void> => {
  const container = document.querySelector<HTMLElement>(containerSelector)
  if (!container) return
  if (container.querySelector(".note-recording-slot")) return

  const recording = await resolveRecording(atUri)
  // Unlike the inline placeholders, nothing in the note asked for this slot —
  // it is inferred from the rkey. A note with no recording gets no empty box
  // and no dead at-uri link.
  if (!recording) return

  // The container can be re-rendered while the resolve is in flight.
  if (!container.isConnected) return
  if (container.querySelector(".note-recording-slot")) return

  const slot = document.createElement("div")
  slot.className = "note-recording-slot"

  const heading = container.querySelector("h1")
  if (heading) heading.insertAdjacentElement("afterend", slot)
  else container.prepend(slot)

  const { default: RecordingPlayer } =
    await import("@/components/RecordingPlayer.vue")
  createApp(RecordingPlayer, { atUri, alt, recording }).mount(slot)
}

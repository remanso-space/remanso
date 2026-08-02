import { computedAsync } from "@vueuse/core"
import { computed, type MaybeRefOrGetter, toValue } from "vue"

import { RECORDING_COLLECTION } from "@/modules/atproto/recording.types"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

/**
 * Resolve the recording attached to a note.
 *
 * A recording belongs to the note carrying the same rkey in the same repo —
 * nothing in the lexicon links them, it is a convention. A note view already
 * knows both halves from its route, so the at-uri needs no lookup and no scan
 * of the markdown: it is spelled out from did + rkey and handed to
 * resolveRecording as-is.
 *
 * Most notes have no recording, so the getRecord behind this 404s far more
 * often than it hits. resolveRecording already turns that into a quiet null
 * (no console noise), which the views read as "no slot".
 */
export const useNoteRecording = (
  did: MaybeRefOrGetter<string>,
  rkey: MaybeRefOrGetter<string>
) => {
  const atUri = computed(
    () => `at://${toValue(did)}/${RECORDING_COLLECTION}/${toValue(rkey)}`
  )

  const recording = computedAsync(() => resolveRecording(atUri.value), null)

  return { atUri, recording }
}

import { computedAsync } from "@vueuse/core"
import { computed, ComputedRef, ref, watch } from "vue"

import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { useNoteRecording } from "@/hooks/useNoteRecording.hook"
import { getAuthor } from "@/modules/atproto/getAuthor"
import { getUrl } from "@/modules/atproto/getUrl"
import type { PublicNoteRecord } from "@/modules/atproto/publicNote.types"
import { withATProtoImages } from "@/modules/atproto/withATProtoImages"
import { errorMessage } from "@/utils/notif"
import { stripLeadingTitle } from "@/utils/stripLeadingTitle"

interface UsePublicNoteRecordOptions {
  /**
   * Drop the note's own `# Title` heading from the body, for views that print
   * the title themselves. Stacked notes keep it: they show the record as it was
   * written.
   */
  stripTitle?: boolean
}

/**
 * Fetch one public note out of its author's repo and turn it into rendered
 * HTML, images resolved against that repo's PDS.
 */
export const usePublicNoteRecord = (
  did: ComputedRef<string>,
  rkey: ComputedRef<string>,
  options: UsePublicNoteRecordOptions = {}
) => {
  const author = computedAsync(async () => getAuthor(did.value))
  const url = computedAsync(
    async () => getUrl({ did: did.value, rkey: rkey.value }),
    null
  )

  const noteNotFound = ref(false)
  const noteRecord = computedAsync(async () => {
    if (!url.value) return null
    const response = await fetch(url.value)
    if (!response.ok) {
      noteNotFound.value = true
      return null
    }
    return response.json() as Promise<PublicNoteRecord>
  })

  watch(noteNotFound, (notFound) => {
    if (notFound) {
      errorMessage("This note no longer exists.")
    }
  })

  const { toHTML } = markdownBuilder()
  const title = computed(() => noteRecord.value?.value.title)
  const content = computed(() => {
    const record = noteRecord.value?.value
    if (!record?.content || !author.value) return ""

    const markdown = options.stripTitle
      ? stripLeadingTitle(record.content, title.value)
      : record.content

    return toHTML(
      withATProtoImages(markdown, { pds: author.value.pds, did: did.value })
    )
  })

  const { atUri: recordingAtUri, recording } = useNoteRecording(did, rkey)

  /**
   * The recording takes its slot only once the note is here and only if the
   * note does not already place it itself: a note written under the old model
   * carries the at-uri inline in its markdown, where markdown-it-recording
   * mounts a player of its own. Waiting for the content also avoids showing the
   * slot above the skeleton and then moving it when the inline copy turns up.
   */
  const showRecording = computed(
    () =>
      !!recording.value &&
      !!content.value &&
      !noteRecord.value?.value.content.includes(recordingAtUri.value)
  )

  return {
    author,
    url,
    noteRecord,
    noteNotFound,
    title,
    content,
    recording,
    recordingAtUri,
    showRecording
  }
}

import { getAuthor } from "@/modules/atproto/getAuthor"
import { parseAtUri } from "@/modules/atproto/parseAtUri"
import {
  type Recording,
  RECORDING_COLLECTION,
  type ResolvedRecording
} from "@/modules/atproto/recording.types"

/**
 * Turn a recording at-uri into something an <audio> element can play.
 *
 * Two hops: getRecord for the blob CID and the display metadata, then a
 * getBlob URL built against the author's PDS. Resolving the record rather
 * than embedding the CID in the markdown means the player can show a title
 * and a duration before any audio loads, and a re-uploaded recording is
 * picked up without editing the note.
 *
 * Returns null on every failure — a missing recording degrades to the alt
 * text rather than breaking the note.
 */
export const resolveRecording = async (
  atUri: string
): Promise<ResolvedRecording | null> => {
  let parsed: { did: string; collection: string; rkey: string }
  try {
    parsed = parseAtUri(atUri)
  } catch {
    return null
  }

  if (parsed.collection !== RECORDING_COLLECTION) return null

  const author = await getAuthor(parsed.did)
  if (!author) return null

  const recordUrl = new URL("/xrpc/com.atproto.repo.getRecord", author.pds)
  recordUrl.searchParams.set("repo", parsed.did)
  recordUrl.searchParams.set("collection", RECORDING_COLLECTION)
  recordUrl.searchParams.set("rkey", parsed.rkey)

  try {
    const response = await fetch(recordUrl.toString())
    if (!response.ok) return null

    const { value } = (await response.json()) as { value: Recording }
    const cid = value?.audio?.ref?.$link
    if (!cid) return null

    const blobUrl = new URL("/xrpc/com.atproto.sync.getBlob", author.pds)
    blobUrl.searchParams.set("did", parsed.did)
    blobUrl.searchParams.set("cid", cid)

    return {
      blobUrl: blobUrl.toString(),
      title: value.title,
      durationSec: value.durationSec
    }
  } catch (error) {
    console.warn("resolveRecording: failed to resolve", atUri, error)
    return null
  }
}

import type { PublicNoteBlob } from "@/modules/atproto/publicNote.types"

export const RECORDING_COLLECTION = "space.remanso.recording"

// Mirrors the lexicon's maxSize. The PDS enforces its own ceiling too
// (PDS_BLOB_UPLOAD_LIMIT, 50MB by default), so rejecting here just gives a
// better error than a failed upload.
export const MAX_RECORDING_BYTES = 50_000_000

export interface Recording {
  audio: PublicNoteBlob
  title?: string
  durationSec?: number
  recordedAt?: string
  createdAt: string
}

export interface ResolvedRecording {
  blobUrl: string
  title?: string
  durationSec?: number
}

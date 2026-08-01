# Audio recordings on published notes

Attach audio — a past stream, a podcast episode, later a voice note — to a
published note. The audio lives as a blob in the author's PDS, held alive by a
`space.remanso.recording` record, and is referenced from the note markdown by
at-uri.

## Decisions

Locked during brainstorming, 2026-08-01.

- **Storage is a PDS blob**, not an external URL. The audio travels with the
  account.
- **The button appears on published notes only** (`*.pub.md`). PDS blobs are
  served publicly by `com.atproto.sync.getBlob` with no auth, and the recording
  record is broadcast on the firehose the moment it is created. Audio attached
  to a private-repo note would be public anyway. Restricting the entry point to
  notes that are already public removes the trap entirely.
- **Phase 1 is file attach. Phase 2 is in-app mic.** Both share one spine. File
  attach is the original need (past streams, podcasts), carries no capture risk,
  and handles a three-hour show. Browser capture has a real ceiling around
  20-30 minutes and iOS Safari drops capture on screen lock.
- **Alt text is the note title followed by ` - audio`.** For a note titled
  `Ma 間`, the inserted line reads `![Ma 間 - audio](at://…)`.
- **`remanso-cli` needs no change for the link to survive**, but not for the
  reason first recorded here. `isLocalPath`
  (`packages/remanso-cli/src/lib/note.ts:37`) only excludes `http://`,
  `https://`, `#` and `mailto:`, so an `at://` URI counts as *local* and
  `processImages` does try to upload it. Every candidate path misses,
  `uploadBlob` returns undefined, and the loop warns
  `Could not upload image: at://…` and continues — leaving the markdown
  untouched. The outcome is right by accident; each publish of a note with
  audio logs a spurious warning. Adding `at://` to `isLocalPath` would make the
  intent explicit and silence it.
  `resolveInternalLinks` is safe regardless: its `(?<![!@])` lookbehind at
  `note.ts:148` excludes image syntax.

## Scope

**Phase 1 — file attach.** Pick an audio file from a published note in edit
mode, upload it, get a player in the rendered note.

**Phase 2 — in-app mic.** Same spine, capture instead of file picker. Shipped;
see "Phase 2 as built" below for the two design calls that differ from the
sketch here.

Out of scope: transcripts, chapters, waveform scrubbing, a recordings index
view, jetstream indexing of recordings, orphan cleanup.

## Lexicon

New file `remanso-jetstream/lexicons/space/remanso/recording.json`:

```json
{
  "lexicon": 1,
  "id": "space.remanso.recording",
  "defs": {
    "main": {
      "type": "record",
      "description": "An audio recording — a past stream, a podcast episode, a voice note — referenced from a Remanso note by at-uri.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["audio", "createdAt"],
        "properties": {
          "audio": {
            "type": "blob",
            "accept": ["audio/*", "video/mp4"],
            "maxSize": 50000000
          },
          "title": { "type": "string", "maxLength": 1000 },
          "durationSec": {
            "type": "integer",
            "description": "Playback length in seconds."
          },
          "recordedAt": {
            "type": "string",
            "format": "datetime",
            "description": "When the audio was originally captured — a past stream's air date, not the upload time."
          },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

`accept` is a wildcard rather than an explicit list, mirroring `image/*` in
`note.json`. An explicit list would reject `audio/x-m4a`, which real tools emit
for m4a files. `maxSize` is the constraint that matters.

`video/mp4` sits alongside `audio/*` because the PDS sniffs the blob's
container instead of trusting the upload's `Content-Type`, and an audio-only
MP4 or M4A sniffs as `video/mp4`. Confirmed against a real upload on
2026-08-01: the app sent `audio/mp4` and eurosky.social stored and serves the
blob as `video/mp4`.

No `note` back-pointer field. At record-creation time the note usually is not
published yet, so the field would sit empty and go stale.

### Publishing the lexicon

The authority domain for `space.remanso.recording` is `remanso.space` (drop the
last NSID segment, reverse the rest). Required DNS record, which does not exist
today:

```
_lexicon.remanso.space   TXT   "did=did:plc:4m3kouplb7s7xozjd3whinvl"
```

`space.remanso.note` was already published as a
`com.atproto.lexicon.schema` record; only the DNS TXT was missing, which left
it unresolvable rather than absent. One TXT record covers both NSIDs.

```bash
go install github.com/bluesky-social/goat@latest
cd /home/jean/projects/remanso-jetstream/lexicons
goat account login -u <handle> -p <app-password>
goat lex publish space/remanso/recording.json
goat account logout
```

`publish` takes a path relative to the lexicons root. Its output symbols
(`lex_publish.go`):

| Symbol | Meaning |
| --- | --- |
| 🟢 | Published — no remote record existed |
| 🟠 | Skipped — a remote record already exists; pass `--update` to overwrite |
| 🟣 | Updated an existing record |
| ⭕ | DNS check failed — the authority does not resolve to your DID |

Use an app password. `goat` stores credentials in cleartext under the home
directory, and `goat account logout` removes them.

**Done, 2026-08-01.** `space.remanso.recording` published 🟢.
`space.remanso.note` returned 🟠, and a diff of the remote record against the
local file confirmed they are identical, so the skip cost nothing.

## The link

One markdown line, full at-uri:

```markdown
![Ma 間 - audio](at://did:plc:4m3kouplb7s7xozjd3whinvl/space.remanso.recording/3xyz)
```

An at-uri rather than a bare blob CID, which is what images use, because:

- The collection segment self-identifies as audio. A bare `bafkrei…` is
  indistinguishable from an image and `withATProtoImages` would render it as
  `<img>`.
- Resolving the record yields `title` and `durationSec`, so the player shows a
  real label before any audio loads.
- It survives a PDS migration.
- It is a standard at-uri, followable by anything else in the atmosphere.

Direction is one-way, note to recording.

Outside Remanso — GitHub web, IDE preview — the line renders as a broken image
showing its alt text, so a reader sees `Ma 間 - audio` rather than a dead URL.
That is why the title goes in the alt slot.

### Alt-text derivation

Resolve the note title in this order:

1. Frontmatter `title:` — every `.pub.md` note has one, the CLI requires it.
2. The leading `# ` heading in the body.
3. Filename.

Do not use `pathToNoteTitle` (`src/utils/noteTitle.ts:16`). It pops one
extension, so `japonais/ma.pub.md` yields `ma.pub`.

Append ` - audio`. A second recording on the same note produces a duplicate alt
string; accepted for phase 1.

## Data flow

### Write

```
published note, edit mode, ATProto session present
  ↓ file picked (accept="audio/*")
guard: size ≤ 50MB, decoded duration read via an <audio> element
  ↓
POST {pds}/xrpc/com.atproto.repo.uploadBlob      Content-Type: file.type
  → BlobRef { $type, ref.$link, mimeType, size }
  ↓ immediately — an unreferenced blob is GC'd after ~1h
POST {pds}/xrpc/com.atproto.repo.createRecord
  { repo: did, collection: "space.remanso.recording",
    record: { audio: BlobRef, title, durationSec, createdAt } }
  → { uri: "at://did/space.remanso.recording/3xyz" }
  ↓
append to rawContent:  ![<title> - audio](<uri>)
  ↓
commit note to GitHub via the existing updateFile path
```

Both XRPC calls go through the OAuth session's DPoP-signed fetch handler. The
`transition:generic` scope already in `public/client-metadata.json` covers
`uploadBlob` and `createRecord`; no scope change and no re-consent.

The record must be created immediately after the upload. Blobs are temporary
until referenced, with a grace period of roughly one hour, so the reference
cannot wait for the CI publish cycle.

### Read

Identical in repo view and published view — no branching.

```
at://did:plc:4m3…/space.remanso.recording/3xyz
  → getAuthor(did)                    existing, cached          → pds
  → com.atproto.repo.getRecord        collection + rkey         → { audio, title, durationSec }
  → com.atproto.sync.getBlob?did=…&cid=…                        → <audio src>
```

Two fetches, both cacheable. Carrying the CID in the markdown would collapse it
to one, but duplicates state and goes stale if the recording is replaced.

### Rendering

Post-render hydration, not a string rewrite. Two reasons:

- `guessMediaType` (`src/utils/markdown/markdown-html5-media.ts:249`) matches
  `/\.([^/.]+)$/`, a file extension at the end of the URL. An at-uri has none,
  so it falls through to `<img>`.
- `getRecord` is async, while `withATProtoImages` is synchronous.

This follows the pattern mermaid, tikz and macroplan already use:

1. `markdown-it-recording` matches `![alt](at://…/space.remanso.recording/…)`
   and emits `<div class="recording-block" data-at-uri="…">`.
2. `useMarkdownPostRender` resolves each block and mounts the player.

## Components

### `remanso`

| File | Change |
| --- | --- |
| `src/modules/atproto/recording.types.ts` | New. `Recording`, `RecordingRecord`, reusing `PublicNoteBlob` |
| `src/modules/atproto/uploadRecording.ts` | New. `uploadBlob` + `createRecord` via the OAuth session fetch handler |
| `src/modules/atproto/resolveRecording.ts` | New. at-uri → `{ blobUrl, title, durationSec }`, using existing `parseAtUri` and `getAuthor` |
| `src/modules/atproto/service/atprotoOAuth.ts` | New `getActiveSession(did)`, wrapping `BrowserOAuthClient.restore` |
| `src/hooks/useAudioUpload.hook.ts` | New. Mirrors `useImageUpload.hook.ts`: validate, upload, return the at-uri |
| `src/utils/markdown/markdown-it-recording.ts` | New plugin |
| `src/hooks/useMarkdown.hook.ts` | Register the plugin |
| `src/hooks/useMarkdownPostRender.hook.ts` | Hydrate `.recording-block` |
| `src/components/RecordingPlayer.vue` | New. DaisyUI player, title and duration from the record |
| `src/components/StackedNote.vue` | Second file input and toolbar button beside the image one (`:509-550`), gated on `.pub.md` and an ATProto session |

No new dependency. `@atproto/api` is not installed and is not needed — the
codebase already calls XRPC endpoints with plain `fetch`, and the OAuth
session's fetch handler adds DPoP.

`useATProtoLogin.hook.ts` is untouched. An earlier draft of this spec claimed
it had to expose the `OAuthSession` it discards; it does not.
`BrowserOAuthClient.restore(sub)` re-derives the session from the DID the hook
already exposes.

### `remanso-jetstream`

| File | Change |
| --- | --- |
| `lexicons/space/remanso/recording.json` | New |

No `jetstream.ts` change. Indexing recordings is a discovery feature, separate
from this.

### `remanso-cli`

None.

## Failure handling

| Case | Behaviour |
| --- | --- |
| No ATProto session | Button hidden. The image button's `canPush` gate is the model |
| Note is not `*.pub.md` | Button hidden |
| File over 50MB | Reject before upload. Error names the size and suggests `ffmpeg -c:a aac -b:a 64k -ac 1` |
| File is not audio | `accept="audio/*"` on the input, plus a MIME check on the handler |
| `uploadBlob` fails | Toast via `errorMessage`, no record created, no markdown written. Nothing to clean up |
| `createRecord` fails after a successful upload | Toast, no markdown written. The orphan blob is GC'd within the hour by design |
| GitHub commit fails after the record is created | The record survives and the markdown does not. Orphan; accepted for phase 1 |
| `getRecord` fails at read time | Player renders the alt text as a link to the at-uri |
| `getBlob` fails at read time | Native `<audio>` error state under the title |
| Line deleted from markdown | Record and blob persist. Known gap — see below |

Format support is left to the browser. AAC in `.m4a` plays everywhere including
old iOS; Opus in `.webm` is roughly twice as efficient at speech bitrates but
breaks on iOS 15.4–17.3. The upload path stores whatever MIME the file carries
and `<audio>` decides.

## Testing

Unit, following the existing `*.spec.ts` convention:

- `resolveRecording` — valid at-uri, wrong collection, unresolvable DID,
  missing record.
- `markdown-it-recording` — matches a recording at-uri, ignores an image at-uri,
  ignores a plain `![](x.mp3)` so `html5Media` keeps handling it, ignores a bare
  CID.
- Alt-text derivation — frontmatter title, H1 fallback, filename fallback,
  `.pub.md` double extension.
- `useAudioUpload` — oversize rejection, non-audio rejection, `createRecord`
  failure leaves `rawContent` untouched.

Manual smoke test, phase 1:

1. Open a `*.pub.md` note in edit mode, signed into both GitHub and ATProto.
2. Attach a small `.m4a`. Confirm the line appears with the note title in the
   alt slot.
3. Save, reload, confirm the player renders and plays.
4. Publish the note, open `/notes/:did/:rkey`, confirm the same player.
5. Check the record exists in a PDS viewer with the blob referenced.

## Phase 2 as built

`useAudioRecorder` wraps MediaRecorder and hands `useAudioUpload` a `File`, so
everything from the size check onward is the phase 1 path unchanged. Two calls
came out differently from the sketch:

- **No IndexedDB chunk persistence.** The plan called for it as crash recovery.
  It buys less than it looks like: a backgrounded mobile tab usually kills the
  capture stream outright, so the failure it protects against mostly isn't
  recoverable anyway, and a long recording is better captured by a real recorder
  app and attached through the file picker — which is exactly what phase 1 is
  for. What shipped instead is a `beforeunload` guard while capturing (the loss
  a user can actually cause) and a one-hour auto-stop that bounds what a
  forgotten tab can throw away. In-app mic is for voice notes, not for streams.
- **Container is probed, not fixed.** `MIME_CANDIDATES` is ordered by playback
  reach rather than encoder quality: MP4/AAC first because Safari below 18.4
  cannot play WebM/Opus, then WebM/Opus for Chrome and Firefox. `durationSec` is
  passed from the recorder's own elapsed count, because a MediaRecorder
  container has no duration in its header and probing the blob returns Infinity.

The lexicon's blob `accept` grew `video/webm` alongside `video/mp4`, for the
same reason: a sniffer that reads no further than the EBML magic calls an
audio-only WebM `video/webm`. Republish with
`goat lex publish --update space/remanso/recording.json`.

## Known gaps

- **Orphan records.** Deleting the markdown line leaves the record and its blob.
  Cleanest fix is a recordings list in the app with delete; a `remanso-cli sync`
  reconcile is the alternative. Neither is phase 1.
- **Duplicate alt text** when a note carries more than one recording.
- **eurosky.social's actual blob ceiling is unverified.** 50MB is the PDS
  default. Confirm with one real upload before trusting the `maxSize` value.
- **Published record has no `audio[]` field.** The audio is only reachable by
  parsing at-uris out of `content`. Mirroring them into an array the way
  `images[]` works would make them visible to other apps, and would be a
  `remanso-cli` change.

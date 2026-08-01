# Audio Recordings on Published Notes — Phase 1 (File Attach) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an author attach an audio file to a published note; the file is stored as a blob in their PDS, held by a `space.remanso.recording` record, and rendered as a player in both the repo and published views.

**Architecture:** The Remanso app uploads the blob and creates the record directly from the browser using the existing ATProto OAuth session, then appends one markdown line carrying an at-uri. At read time a markdown-it renderer override turns that line into a placeholder div, and a post-render pass resolves the at-uri to a blob URL and mounts a Vue player. No changes to `remanso-cli`.

**Tech Stack:** Vue 3 Composition API, TypeScript strict, Vitest + `@vue/test-utils`, markdown-it, `@atproto/oauth-client-browser`, DaisyUI v5, Tailwind v4.

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-08-01-atproto-audio-design.md`. Read it before starting.
- **No new npm dependencies.** `@atproto/api` is deliberately not installed — call XRPC endpoints through `OAuthSession.fetchHandler`, which already applies DPoP signing.
- Path alias `@` maps to `src/`.
- All components use `<script setup lang="ts">`.
- Tests live beside their subject as `*.spec.ts` (existing convention — see `src/modules/atproto/parseAtUri.spec.ts`).
- Icons are inline Tabler outline SVG with `stroke="currentColor"`.
- Never use `text-accent` or `var(--color-accent)`. Use `var(--link-accent)` or `text-(--link-accent)`.
- Max blob size: `50000000` bytes. Define it once as `MAX_RECORDING_BYTES` in `src/modules/atproto/recording.types.ts` and import it everywhere.
- Recording collection NSID: `space.remanso.recording`. Define once as `RECORDING_COLLECTION` in the same file.
- Alt text format is exactly `` `${noteTitle} - audio` `` — a space, a hyphen, a space.
- Run `pnpm test`, `pnpm lint`, `pnpm types` before each commit. All three must pass.
- Conventional Commits. No `Co-Authored-By` trailers, no Claude attribution.

## File Structure

**`remanso-jetstream`**

| File | Responsibility |
| --- | --- |
| `lexicons/space/remanso/recording.json` | Record schema. Published to the network with `goat lex publish` |

**`remanso` — new**

| File | Responsibility |
| --- | --- |
| `src/modules/atproto/recording.types.ts` | Types + the two shared constants |
| `src/modules/atproto/resolveRecording.ts` | at-uri → `{ blobUrl, title, durationSec }` |
| `src/modules/atproto/uploadRecording.ts` | `uploadBlob` + `createRecord`, returns the at-uri |
| `src/modules/atproto/runRecordings.ts` | Mounts players onto `.recording-block` placeholders |
| `src/components/RecordingPlayer.vue` | The player |
| `src/utils/markdown/markdown-it-recording.ts` | Renderer override emitting the placeholder |
| `src/utils/noteTitleForAlt.ts` | Alt-text derivation from note content + path |
| `src/hooks/useAudioUpload.hook.ts` | Validation + orchestration for the UI |

**`remanso` — modified**

| File | Change |
| --- | --- |
| `src/modules/atproto/parseAtUri.ts` | Also return `collection` |
| `src/modules/atproto/service/atprotoOAuth.ts` | Add `getActiveSession(did)` |
| `src/hooks/useMarkdown.hook.ts` | Register the plugin |
| `src/hooks/useMarkdownPostRender.hook.ts` | Call `runRecordings` |
| `src/components/StackedNote.vue` | Toolbar button + file input |

**Note — a spec correction.** The spec says `useATProtoLogin.hook.ts` must expose the live `OAuthSession`. It does not. `BrowserOAuthClient.restore(sub)` re-derives the session from the DID the hook already exposes (verified at `node_modules/@atproto/oauth-client-browser/dist/browser-oauth-client.d.ts:41`). Task 6 adds `getActiveSession(did)` to the OAuth service instead, and `useATProtoLogin.hook.ts` is left untouched.

---

### Task 1: Lexicon schema

**Files:**
- Create: `/home/jean/projects/remanso-jetstream/lexicons/space/remanso/recording.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the on-network shape that `uploadRecording` (Task 6) writes and `resolveRecording` (Task 3) reads — `audio` (blob), `title` (string), `durationSec` (integer), `recordedAt` (datetime), `createdAt` (datetime).

- [ ] **Step 1: Create the lexicon file**

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
            "accept": ["audio/*"],
            "maxSize": 50000000
          },
          "title": {
            "type": "string",
            "maxLength": 1000
          },
          "durationSec": {
            "type": "integer",
            "description": "Playback length in seconds."
          },
          "recordedAt": {
            "type": "string",
            "format": "datetime",
            "description": "When the audio was originally captured — a past stream's air date, not the upload time."
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Verify it parses and the shape matches the sibling lexicon**

Run:

```bash
cd /home/jean/projects/remanso-jetstream
node -e "const r=require('./lexicons/space/remanso/recording.json'); if(r.id!=='space.remanso.recording') throw new Error('bad id'); if(r.defs.main.record.properties.audio.maxSize!==50000000) throw new Error('bad maxSize'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
cd /home/jean/projects/remanso-jetstream
git add lexicons/space/remanso/recording.json
git commit -m "feat(lexicon): add space.remanso.recording schema"
```

**Not part of this task:** publishing with `goat` and the `_lexicon.remanso.space` DNS TXT record. Those are manual operator steps documented in the spec. The feature works without them — publishing only makes the schema discoverable to other apps.

---

### Task 2: `parseAtUri` returns the collection

**Files:**
- Modify: `src/modules/atproto/parseAtUri.ts`
- Test: `src/modules/atproto/parseAtUri.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseAtUri(atUri: string): { did: string; collection: string; rkey: string }`. The existing `did` and `rkey` fields keep their meaning, so current callers (`useATProtoLinks.hook.ts`) are unaffected.

- [ ] **Step 1: Write the failing test**

Append to `src/modules/atproto/parseAtUri.spec.ts`, inside the existing top-level `describe`:

```ts
  it("returns the collection segment", () => {
    expect(parseAtUri("at://did:plc:abc/space.remanso.recording/3xyz")).toEqual({
      did: "did:plc:abc",
      collection: "space.remanso.recording",
      rkey: "3xyz"
    })
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/modules/atproto/parseAtUri.spec.ts`
Expected: FAIL — the returned object has no `collection` key.

Note: the file's existing tests use `toEqual` with only `did` and `rkey`, so they will fail too once `collection` is added. That is expected and Step 3 fixes them.

- [ ] **Step 3: Add the collection capture group**

Replace the body of `src/modules/atproto/parseAtUri.ts`:

```ts
export const parseAtUri = (
  atUri: string
): { did: string; collection: string; rkey: string } => {
  const match = atUri.match(/^at:\/\/(did:[^/]+)\/([^/]+)\/(.+)$/)
  if (!match) {
    throw new Error(`Invalid AT URI: ${atUri}`)
  }
  return { did: match[1], collection: match[2], rkey: match[3] }
}
```

- [ ] **Step 4: Update the pre-existing assertions**

In `src/modules/atproto/parseAtUri.spec.ts`, add the matching `collection` key to every existing `toEqual({ did, rkey })` assertion. For example the `app.bsky.feed.post` case becomes:

```ts
    expect(parseAtUri("at://did:plc:abc123/app.bsky.feed.post/rkey-xyz")).toEqual({
      did: "did:plc:abc123",
      collection: "app.bsky.feed.post",
      rkey: "rkey-xyz"
    })
```

Do the same for the `did:web` case and the multi-segment rkey case. Leave the four throwing cases as they are.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/modules/atproto/parseAtUri.spec.ts`
Expected: PASS, all cases.

- [ ] **Step 6: Verify no other caller broke**

Run: `pnpm test && pnpm types`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/atproto/parseAtUri.ts src/modules/atproto/parseAtUri.spec.ts
git commit -m "refactor(atproto): return the collection from parseAtUri"
```

---

### Task 3: Types, constants, and `resolveRecording`

**Files:**
- Create: `src/modules/atproto/recording.types.ts`
- Create: `src/modules/atproto/resolveRecording.ts`
- Test: `src/modules/atproto/resolveRecording.spec.ts`

**Interfaces:**
- Consumes: `parseAtUri` (Task 2), the existing `getAuthor` from `@/modules/atproto/getAuthor` (returns `{ handle, pds } | null`), and the existing `PublicNoteBlob` type from `@/modules/atproto/publicNote.types`.
- Produces:
  - `RECORDING_COLLECTION = "space.remanso.recording"`
  - `MAX_RECORDING_BYTES = 50_000_000`
  - `interface Recording { audio: PublicNoteBlob; title?: string; durationSec?: number; recordedAt?: string; createdAt: string }`
  - `interface ResolvedRecording { blobUrl: string; title?: string; durationSec?: number }`
  - `resolveRecording(atUri: string): Promise<ResolvedRecording | null>`

- [ ] **Step 1: Create the types module**

`src/modules/atproto/recording.types.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing tests**

`src/modules/atproto/resolveRecording.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getAuthor } from "@/modules/atproto/getAuthor"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

vi.mock("@/modules/atproto/getAuthor", () => ({
  getAuthor: vi.fn()
}))

const URI = "at://did:plc:abc/space.remanso.recording/3xyz"

const recordResponse = {
  uri: URI,
  cid: "bafyrei111",
  value: {
    audio: {
      $type: "blob",
      ref: { $link: "bafkrei222" },
      mimeType: "audio/mp4",
      size: 1234
    },
    title: "Stream du 12 mai",
    durationSec: 3600,
    createdAt: "2026-05-12T10:00:00Z"
  }
}

describe("resolveRecording", () => {
  beforeEach(() => {
    vi.mocked(getAuthor).mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("resolves to a getBlob URL plus the record metadata", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => recordResponse
    } as unknown as Response)

    const result = await resolveRecording(URI)

    expect(result?.title).toBe("Stream du 12 mai")
    expect(result?.durationSec).toBe(3600)

    const url = new URL(result!.blobUrl)
    expect(url.origin).toBe("https://eurosky.social")
    expect(url.pathname).toBe("/xrpc/com.atproto.sync.getBlob")
    expect(url.searchParams.get("did")).toBe("did:plc:abc")
    expect(url.searchParams.get("cid")).toBe("bafkrei222")
  })

  it("returns null when the collection is not a recording", async () => {
    const result = await resolveRecording(
      "at://did:plc:abc/space.remanso.note/3xyz"
    )

    expect(result).toBeNull()
    expect(getAuthor).not.toHaveBeenCalled()
  })

  it("returns null for a malformed at-uri", async () => {
    expect(await resolveRecording("https://example.com/nope")).toBeNull()
  })

  it("returns null when the author cannot be resolved", async () => {
    vi.mocked(getAuthor).mockResolvedValue(null)

    expect(await resolveRecording(URI)).toBeNull()
  })

  it("returns null when the record fetch fails", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(fetch).mockResolvedValue({ ok: false } as unknown as Response)

    expect(await resolveRecording(URI)).toBeNull()
  })

  it("returns null when the record carries no audio blob", async () => {
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ uri: URI, cid: "x", value: { createdAt: "now" } })
    } as unknown as Response)

    expect(await resolveRecording(URI)).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test src/modules/atproto/resolveRecording.spec.ts`
Expected: FAIL — cannot resolve `@/modules/atproto/resolveRecording`.

- [ ] **Step 4: Write the implementation**

`src/modules/atproto/resolveRecording.ts`:

```ts
import { getAuthor } from "@/modules/atproto/getAuthor"
import { parseAtUri } from "@/modules/atproto/parseAtUri"
import {
  RECORDING_COLLECTION,
  type Recording,
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/modules/atproto/resolveRecording.spec.ts`
Expected: PASS, six cases.

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm types
git add src/modules/atproto/recording.types.ts src/modules/atproto/resolveRecording.ts src/modules/atproto/resolveRecording.spec.ts
git commit -m "feat(atproto): resolve recording at-uris to blob URLs"
```

---

### Task 4: markdown-it recording plugin

**Files:**
- Create: `src/utils/markdown/markdown-it-recording.ts`
- Test: `src/utils/markdown/markdown-it-recording.spec.ts`
- Modify: `src/hooks/useMarkdown.hook.ts`

**Interfaces:**
- Consumes: `RECORDING_COLLECTION` (Task 3).
- Produces: `markdownItRecording(md: MarkdownIt): void`, and the rendered contract `<div class="recording-block" data-at-uri="…" data-alt="…"></div>` that Task 5 hydrates.

**Why a renderer override and not a new inline rule:** `html5Media` already forks the image tokenizer, and its `guessMediaType` (`src/utils/markdown/markdown-html5-media.ts:249`) matches a trailing file extension. An at-uri has none, so it falls through and pushes a plain `image` token. Overriding `md.renderer.rules.image` intercepts exactly that token, and nothing else in the pipeline sets an image renderer (verified). A second inline rule would have to race the tokenizer.

- [ ] **Step 1: Write the failing tests**

`src/utils/markdown/markdown-it-recording.spec.ts`:

```ts
import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { html5Media } from "@/utils/markdown/markdown-html5-media"
import { markdownItRecording } from "@/utils/markdown/markdown-it-recording"

const render = (src: string) =>
  new MarkdownIt().use(html5Media).use(markdownItRecording).render(src)

const URI = "at://did:plc:abc/space.remanso.recording/3xyz"

describe("markdownItRecording", () => {
  it("emits a placeholder for a recording at-uri", () => {
    const html = render(`![Ma 間 - audio](${URI})`)

    expect(html).toContain('class="recording-block"')
    expect(html).toContain(`data-at-uri="${URI}"`)
    expect(html).toContain('data-alt="Ma 間 - audio"')
    expect(html).not.toContain("<img")
  })

  it("escapes quotes in the alt text", () => {
    const html = render(`![say "hi" - audio](${URI})`)

    expect(html).toContain("&quot;hi&quot;")
    expect(html).not.toContain('data-alt="say "hi"')
  })

  it("leaves a note at-uri as an image", () => {
    const html = render("![nope](at://did:plc:abc/space.remanso.note/3xyz)")

    expect(html).toContain("<img")
    expect(html).not.toContain("recording-block")
  })

  it("leaves a plain audio file to html5Media", () => {
    const html = render("![](song.mp3)")

    expect(html).toContain("<audio")
    expect(html).not.toContain("recording-block")
  })

  it("leaves a bare blob CID as an image", () => {
    const html = render("![photo](bafkrei222)")

    expect(html).toContain("<img")
    expect(html).not.toContain("recording-block")
  })

  it("leaves a regular image alone", () => {
    const html = render("![cat](cat.png)")

    expect(html).toContain("<img")
    expect(html).not.toContain("recording-block")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/utils/markdown/markdown-it-recording.spec.ts`
Expected: FAIL — cannot resolve `@/utils/markdown/markdown-it-recording`.

- [ ] **Step 3: Write the plugin**

`src/utils/markdown/markdown-it-recording.ts`:

```ts
import type MarkdownIt from "markdown-it"

import { RECORDING_COLLECTION } from "@/modules/atproto/recording.types"

const RECORDING_URI = new RegExp(
  `^at://did:[^/]+/${RECORDING_COLLECTION.replaceAll(".", "\\.")}/[^/]+$`
)

/**
 * Render `![Title - audio](at://did/space.remanso.recording/rkey)` as a
 * placeholder that runRecordings mounts a player onto.
 *
 * This overrides the image renderer rather than adding an inline rule:
 * html5Media already forks the image tokenizer and keys off a trailing file
 * extension, which an at-uri lacks, so a recording link arrives here as a
 * plain `image` token. Anything that isn't a recording at-uri is handed back
 * to the previous renderer untouched.
 */
export const markdownItRecording = (md: MarkdownIt): void => {
  const fallback =
    md.renderer.rules.image ??
    ((tokens, index, options, _env, self) =>
      self.renderToken(tokens, index, options))

  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const src = token.attrGet("src") ?? ""

    if (!RECORDING_URI.test(src)) {
      return fallback(tokens, index, options, env, self)
    }

    const alt = md.utils.escapeHtml(token.content ?? "")
    const uri = md.utils.escapeHtml(src)

    return `<div class="recording-block" data-at-uri="${uri}" data-alt="${alt}"></div>\n`
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/utils/markdown/markdown-it-recording.spec.ts`
Expected: PASS, six cases.

- [ ] **Step 5: Register the plugin**

In `src/hooks/useMarkdown.hook.ts`, add the import beside the other markdown util imports:

```ts
import { markdownItRecording } from "@/utils/markdown/markdown-it-recording"
```

Then add `.use(markdownItRecording)` to the `md` chain immediately after `.use(html5Media)` (currently line 144). Order matters: `html5Media` installs the tokenizer, and `markdownItRecording` captures the previous image renderer when it runs.

- [ ] **Step 6: Verify the whole suite still passes**

Run: `pnpm test && pnpm lint && pnpm types`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/markdown/markdown-it-recording.ts src/utils/markdown/markdown-it-recording.spec.ts src/hooks/useMarkdown.hook.ts
git commit -m "feat(markdown): render recording at-uris as player placeholders"
```

---

### Task 5: Player component and hydration

**Files:**
- Create: `src/components/RecordingPlayer.vue`
- Create: `src/modules/atproto/runRecordings.ts`
- Test: `src/components/RecordingPlayer.spec.ts`
- Modify: `src/hooks/useMarkdownPostRender.hook.ts`

**Interfaces:**
- Consumes: `resolveRecording` and `ResolvedRecording` (Task 3), the `.recording-block` contract (Task 4).
- Produces: `runRecordings(querySelector: string): Promise<void>`, mirroring `runMacroplan`/`runInstruments`.

After this task the read path works end to end: a note whose markdown already contains a recording at-uri renders a working player in both `/:user/:repo` and `/notes/:did/:rkey`.

- [ ] **Step 1: Write the failing component test**

`src/components/RecordingPlayer.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/components/RecordingPlayer.spec.ts`
Expected: FAIL — cannot resolve `./RecordingPlayer.vue`.

- [ ] **Step 3: Write the component**

`src/components/RecordingPlayer.vue`:

```vue
<script setup lang="ts">
import { computed } from "vue"

import type { ResolvedRecording } from "@/modules/atproto/recording.types"

const props = defineProps<{
  atUri: string
  alt: string
  recording: ResolvedRecording | null
}>()

const label = computed(() => props.recording?.title || props.alt)

const duration = computed(() => {
  const total = props.recording?.durationSec
  if (!total || total <= 0) return null

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
})
</script>

<template>
  <figure v-if="recording" class="recording-player">
    <figcaption class="recording-caption">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-microphone-2"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path
          d="M15 12.9a5 5 0 1 0 -3.902 -3.9"
        />
        <path d="M15 12.9l-3.902 -3.899l-7.513 8.584a2 2 0 1 0 2.83 2.83l8.585 -7.515z" />
      </svg>
      <span class="recording-title">{{ label }}</span>
      <span v-if="duration" class="recording-duration">{{ duration }}</span>
    </figcaption>
    <audio controls preload="metadata" :src="recording.blobUrl"></audio>
  </figure>
  <p v-else class="recording-unavailable">
    <a :href="atUri">{{ alt }}</a>
  </p>
</template>

<style scoped lang="scss">
.recording-player {
  margin: 1.5rem 0;

  audio {
    width: 100%;
  }
}

.recording-caption {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9em;

  svg {
    color: var(--link-accent);
    flex-shrink: 0;
  }
}

.recording-title {
  font-weight: 600;
}

.recording-duration {
  margin-left: auto;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.recording-unavailable a {
  color: var(--link-accent);
}
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/components/RecordingPlayer.spec.ts`
Expected: PASS, five cases.

- [ ] **Step 5: Write the hydration runner**

`src/modules/atproto/runRecordings.ts`:

```ts
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
```

- [ ] **Step 6: Wire it into the post-render hook**

In `src/hooks/useMarkdownPostRender.hook.ts`, add the import beside the other `run*` imports:

```ts
import { runRecordings } from "@/modules/atproto/runRecordings"
```

Then add this immediately after the `runInstruments` push (currently line 52):

```ts
      // Unconditional for the same reason as instruments: one querySelectorAll
      // when no recording exists, and both the repo and public views get
      // players without another option flag.
      renderJobs.push(runRecordings(`${scope} .recording-block`))
```

- [ ] **Step 7: Verify the whole suite still passes**

Run: `pnpm test && pnpm lint && pnpm types`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/RecordingPlayer.vue src/components/RecordingPlayer.spec.ts src/modules/atproto/runRecordings.ts src/hooks/useMarkdownPostRender.hook.ts
git commit -m "feat(atproto): mount audio players on recording placeholders"
```

---

### Task 6: Upload service

**Files:**
- Modify: `src/modules/atproto/service/atprotoOAuth.ts`
- Create: `src/modules/atproto/uploadRecording.ts`
- Test: `src/modules/atproto/uploadRecording.spec.ts`

**Interfaces:**
- Consumes: `RECORDING_COLLECTION` (Task 3), `getOAuthClient` from the existing OAuth service.
- Produces:
  - `getActiveSession(did: string): Promise<OAuthSession | null>` in `atprotoOAuth.ts`
  - `uploadRecording(params: { did: string; file: File; title: string; durationSec?: number }): Promise<string | null>` returning the at-uri, or null on failure.

`OAuthSession.fetchHandler(pathname, init)` takes a **pathname**, resolves it against the session's PDS, and applies DPoP signing (verified at `node_modules/.pnpm/@atproto+oauth-client@0.6.0/node_modules/@atproto/oauth-client/dist/oauth-session.d.ts:32`). No PDS URL and no `@atproto/api` needed.

- [ ] **Step 1: Add `getActiveSession` to the OAuth service**

Append to `src/modules/atproto/service/atprotoOAuth.ts`:

```ts
/**
 * Re-derive the live OAuth session for a DID. `init()` hands the session back
 * only once, on the redirect that created it, so anything needing to write to
 * the PDS later restores it from storage by DID instead.
 */
export const getActiveSession = async (did: string) => {
  try {
    const client = await getOAuthClient()
    return await client.restore(did)
  } catch (error) {
    console.warn("getActiveSession: could not restore session", error)
    return null
  }
}
```

- [ ] **Step 2: Write the failing tests**

`src/modules/atproto/uploadRecording.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getActiveSession } from "@/modules/atproto/service/atprotoOAuth"
import { uploadRecording } from "@/modules/atproto/uploadRecording"

vi.mock("@/modules/atproto/service/atprotoOAuth", () => ({
  getActiveSession: vi.fn()
}))

const blobRef = {
  $type: "blob",
  ref: { $link: "bafkrei222" },
  mimeType: "audio/mp4",
  size: 1234
}

const makeFile = () =>
  new File([new Uint8Array([1, 2, 3])], "stream.m4a", { type: "audio/mp4" })

const okJson = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response

describe("uploadRecording", () => {
  beforeEach(() => {
    vi.mocked(getActiveSession).mockReset()
  })

  it("uploads the blob then creates the record and returns the at-uri", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3xyz" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({
      fetchHandler
    } as never)

    const uri = await uploadRecording({
      did: "did:plc:abc",
      file: makeFile(),
      title: "Ma 間 - audio",
      durationSec: 3600
    })

    expect(uri).toBe("at://did:plc:abc/space.remanso.recording/3xyz")

    const [uploadPath, uploadInit] = fetchHandler.mock.calls[0]
    expect(uploadPath).toBe("/xrpc/com.atproto.repo.uploadBlob")
    expect(uploadInit.method).toBe("POST")
    expect(uploadInit.headers["Content-Type"]).toBe("audio/mp4")

    const [createPath, createInit] = fetchHandler.mock.calls[1]
    expect(createPath).toBe("/xrpc/com.atproto.repo.createRecord")
    const body = JSON.parse(createInit.body)
    expect(body.repo).toBe("did:plc:abc")
    expect(body.collection).toBe("space.remanso.recording")
    expect(body.record.audio).toEqual(blobRef)
    expect(body.record.title).toBe("Ma 間 - audio")
    expect(body.record.durationSec).toBe(3600)
    expect(body.record.createdAt).toEqual(expect.any(String))
  })

  it("omits durationSec when it is unknown", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3xyz" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    await uploadRecording({
      did: "did:plc:abc",
      file: makeFile(),
      title: "Ma 間 - audio"
    })

    const body = JSON.parse(fetchHandler.mock.calls[1][1].body)
    expect(body.record).not.toHaveProperty("durationSec")
  })

  it("returns null when there is no session", async () => {
    vi.mocked(getActiveSession).mockResolvedValue(null)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toBeNull()
  })

  it("returns null and skips createRecord when the upload fails", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 413 } as unknown as Response)
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toBeNull()
    expect(fetchHandler).toHaveBeenCalledTimes(1)
  })

  it("returns null when createRecord fails", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce({ ok: false, status: 400 } as unknown as Response)
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test src/modules/atproto/uploadRecording.spec.ts`
Expected: FAIL — cannot resolve `@/modules/atproto/uploadRecording`.

- [ ] **Step 4: Write the implementation**

`src/modules/atproto/uploadRecording.ts`:

```ts
import type { PublicNoteBlob } from "@/modules/atproto/publicNote.types"
import { RECORDING_COLLECTION } from "@/modules/atproto/recording.types"
import { getActiveSession } from "@/modules/atproto/service/atprotoOAuth"

interface UploadRecordingParams {
  did: string
  file: File
  title: string
  durationSec?: number
}

/**
 * Put an audio file in the author's PDS and return the at-uri that the note
 * markdown will point at.
 *
 * The record is created immediately after the upload on purpose: an
 * unreferenced blob is temporary and gets garbage collected, with roughly an
 * hour of grace. The reference cannot wait for the publish cycle.
 *
 * Returns null on any failure. A failed upload leaves nothing behind; a failed
 * createRecord leaves an orphan blob that the PDS collects on its own.
 */
export const uploadRecording = async ({
  did,
  file,
  title,
  durationSec
}: UploadRecordingParams): Promise<string | null> => {
  const session = await getActiveSession(did)
  if (!session) return null

  try {
    const uploaded = await session.fetchHandler(
      "/xrpc/com.atproto.repo.uploadBlob",
      {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file
      }
    )

    if (!uploaded.ok) {
      console.warn("uploadRecording: uploadBlob failed", uploaded.status)
      return null
    }

    const { blob } = (await uploaded.json()) as { blob: PublicNoteBlob }

    const created = await session.fetchHandler(
      "/xrpc/com.atproto.repo.createRecord",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: did,
          collection: RECORDING_COLLECTION,
          record: {
            audio: blob,
            title,
            ...(durationSec ? { durationSec } : {}),
            createdAt: new Date().toISOString()
          }
        })
      }
    )

    if (!created.ok) {
      console.warn("uploadRecording: createRecord failed", created.status)
      return null
    }

    const { uri } = (await created.json()) as { uri: string }
    return uri ?? null
  } catch (error) {
    console.warn("uploadRecording: failed", error)
    return null
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/modules/atproto/uploadRecording.spec.ts`
Expected: PASS, five cases.

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm types
git add src/modules/atproto/service/atprotoOAuth.ts src/modules/atproto/uploadRecording.ts src/modules/atproto/uploadRecording.spec.ts
git commit -m "feat(atproto): upload audio blobs and create recording records"
```

---

### Task 7: Alt-text derivation

**Files:**
- Create: `src/utils/noteTitleForAlt.ts`
- Test: `src/utils/noteTitleForAlt.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `noteTitleForAlt(content: string, path: string): string` — returns the note title with ` - audio` already appended.

**Why not `pathToNoteTitle`:** it pops a single extension (`src/utils/noteTitle.ts:16`), so `japonais/ma.pub.md` yields `ma.pub`. Frontmatter is also a better source — every `.pub.md` note carries a `title:` because the CLI requires it, and it holds the real title (`Ma 間`) rather than a slug.

- [ ] **Step 1: Write the failing tests**

`src/utils/noteTitleForAlt.spec.ts`:

```ts
import { describe, expect, it } from "vitest"

import { noteTitleForAlt } from "@/utils/noteTitleForAlt"

describe("noteTitleForAlt", () => {
  it("prefers the frontmatter title", () => {
    const content = `---
title: Ma 間
publishDate: 2026-02-02
---

# Something Else
`
    expect(noteTitleForAlt(content, "japonais/ma.pub.md")).toBe("Ma 間 - audio")
  })

  it("strips quotes from a quoted frontmatter title", () => {
    const content = `---
title: 'Ma 間'
---
`
    expect(noteTitleForAlt(content, "japonais/ma.pub.md")).toBe("Ma 間 - audio")
  })

  it("falls back to the leading H1 when there is no frontmatter title", () => {
    const content = `---
publishDate: 2026-02-02
---

# Ma 間

Body.
`
    expect(noteTitleForAlt(content, "japonais/ma.pub.md")).toBe("Ma 間 - audio")
  })

  it("uses the H1 when there is no frontmatter at all", () => {
    expect(noteTitleForAlt("# Ma 間\n\nBody.\n", "japonais/ma.pub.md")).toBe(
      "Ma 間 - audio"
    )
  })

  it("falls back to the filename, stripping the .pub.md double extension", () => {
    expect(noteTitleForAlt("Body with no title.\n", "japonais/ma.pub.md")).toBe(
      "ma - audio"
    )
  })

  it("turns hyphens into spaces in the filename fallback", () => {
    expect(
      noteTitleForAlt("Body.\n", "mieux-echouer/quantity-brings-quality.pub.md")
    ).toBe("quantity brings quality - audio")
  })

  it("handles a plain .md path", () => {
    expect(noteTitleForAlt("Body.\n", "notes/my-note.md")).toBe(
      "my note - audio"
    )
  })

  it("returns just the suffix when nothing can be derived", () => {
    expect(noteTitleForAlt("", "")).toBe("- audio")
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/utils/noteTitleForAlt.spec.ts`
Expected: FAIL — cannot resolve `@/utils/noteTitleForAlt`.

- [ ] **Step 3: Write the implementation**

`src/utils/noteTitleForAlt.ts`:

```ts
const FRONTMATTER = /^\s*---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/
const FRONTMATTER_TITLE = /^title:[ \t]*(.+?)[ \t]*$/m
const LEADING_H1 = /^[ \t]*#[ \t]+(.+?)[ \t]*$/m

const unquote = (value: string) => value.replace(/^['"]|['"]$/g, "").trim()

const fromFilename = (path: string): string => {
  const filename = path.split("/").pop() ?? ""
  // .pub.md is two extensions, so strip the known suffixes rather than
  // popping one dot-segment — pathToNoteTitle turns ma.pub.md into "ma.pub".
  return filename
    .replace(/\.(pub\.)?(md|markdown|mdx)$/i, "")
    .replaceAll("-", " ")
    .trim()
}

/**
 * The alt text for a recording line: the note's title followed by " - audio".
 *
 * Outside Remanso this is all a reader sees — GitHub and IDE previews render
 * the line as a broken image and show the alt text — so it has to name the
 * note, not the file. Frontmatter first (every .pub.md has a title, the CLI
 * requires it), then the leading H1, then the filename.
 */
export const noteTitleForAlt = (content: string, path: string): string => {
  const frontmatter = content.match(FRONTMATTER)

  const frontmatterTitle = frontmatter?.[1]?.match(FRONTMATTER_TITLE)?.[1]
  if (frontmatterTitle) return `${unquote(frontmatterTitle)} - audio`

  const body = frontmatter ? content.slice(frontmatter[0].length) : content
  const heading = body.match(LEADING_H1)?.[1]
  if (heading) return `${heading.trim()} - audio`

  return `${fromFilename(path)} - audio`.trim()
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/utils/noteTitleForAlt.spec.ts`
Expected: PASS, eight cases.

- [ ] **Step 5: Commit**

```bash
pnpm lint && pnpm types
git add src/utils/noteTitleForAlt.ts src/utils/noteTitleForAlt.spec.ts
git commit -m "feat(notes): derive recording alt text from the note title"
```

---

### Task 8: Upload hook

**Files:**
- Create: `src/hooks/useAudioUpload.hook.ts`
- Test: `src/hooks/useAudioUpload.hook.spec.ts`

**Interfaces:**
- Consumes: `uploadRecording` (Task 6), `noteTitleForAlt` (Task 7), `MAX_RECORDING_BYTES` (Task 3), the existing `errorMessage` from `@/utils/notif`.
- Produces: `useAudioUpload({ did, notePath, noteContent })` where all three are `Ref<string | undefined> | string | undefined`, returning `{ attachAudio(file: File): Promise<{ markdown: string } | null> }`. `markdown` is the finished line, alt text included.

`did` is a `MaybeRef` rather than a plain string on purpose: the ATProto session restores asynchronously after mount, so a value read once at setup time would still be empty when the user clicks.

Duration is read by decoding the file in an `<audio>` element. It is best-effort: if the browser cannot report it, the record simply omits `durationSec` and the player hides the duration.

- [ ] **Step 1: Write the failing tests**

`src/hooks/useAudioUpload.hook.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAudioUpload } from "@/hooks/useAudioUpload.hook"
import { uploadRecording } from "@/modules/atproto/uploadRecording"
import { errorMessage } from "@/utils/notif"

vi.mock("@/modules/atproto/uploadRecording", () => ({
  uploadRecording: vi.fn()
}))
vi.mock("@/utils/notif", () => ({
  errorMessage: vi.fn(),
  successMessage: vi.fn()
}))

const NOTE = `---
title: Ma 間
---

# Ma 間
`

const makeFile = (size: number, type = "audio/mp4") => {
  const file = new File([new Uint8Array(1)], "stream.m4a", { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

const subject = () =>
  useAudioUpload({
    did: "did:plc:abc",
    notePath: "japonais/ma.pub.md",
    noteContent: NOTE
  })

describe("useAudioUpload", () => {
  beforeEach(() => {
    vi.mocked(uploadRecording).mockReset()
    vi.mocked(errorMessage).mockReset()
  })

  it("returns the finished markdown line on success", async () => {
    vi.mocked(uploadRecording).mockResolvedValue(
      "at://did:plc:abc/space.remanso.recording/3xyz"
    )

    const result = await subject().attachAudio(makeFile(1000))

    expect(result).toEqual({
      markdown:
        "![Ma 間 - audio](at://did:plc:abc/space.remanso.recording/3xyz)"
    })
    expect(vi.mocked(uploadRecording).mock.calls[0][0].title).toBe(
      "Ma 間 - audio"
    )
  })

  it("rejects a file over the size ceiling without uploading", async () => {
    const result = await subject().attachAudio(makeFile(50_000_001))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
    expect(errorMessage).toHaveBeenCalled()
  })

  it("rejects a non-audio file without uploading", async () => {
    const result = await subject().attachAudio(makeFile(1000, "image/png"))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
    expect(errorMessage).toHaveBeenCalled()
  })

  it("returns null and warns when the upload fails", async () => {
    vi.mocked(uploadRecording).mockResolvedValue(null)

    expect(await subject().attachAudio(makeFile(1000))).toBeNull()
    expect(errorMessage).toHaveBeenCalled()
  })

  it("returns null when the note path is unknown", async () => {
    const result = await useAudioUpload({
      did: "did:plc:abc",
      notePath: undefined,
      noteContent: NOTE
    }).attachAudio(makeFile(1000))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
  })

  it("returns null when the ATProto session has not restored yet", async () => {
    const result = await useAudioUpload({
      did: () => undefined,
      notePath: "japonais/ma.pub.md",
      noteContent: NOTE
    }).attachAudio(makeFile(1000))

    expect(result).toBeNull()
    expect(uploadRecording).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/hooks/useAudioUpload.hook.spec.ts`
Expected: FAIL — cannot resolve `@/hooks/useAudioUpload.hook`.

- [ ] **Step 3: Write the implementation**

`src/hooks/useAudioUpload.hook.ts`:

```ts
import { type Ref, toValue } from "vue"

import { MAX_RECORDING_BYTES } from "@/modules/atproto/recording.types"
import { uploadRecording } from "@/modules/atproto/uploadRecording"
import { noteTitleForAlt } from "@/utils/noteTitleForAlt"
import { errorMessage } from "@/utils/notif"

// A getter is in the union because the ATProto DID arrives as Ref<string | null>
// from useATProtoLogin, and Ref is invariant — Ref<string | null> will not
// assign to Ref<string | undefined>. `toValue` unwraps all three forms.
type MaybeRef =
  | Ref<string | undefined>
  | (() => string | undefined)
  | string
  | undefined

const megabytes = (bytes: number) => Math.round(bytes / 1_000_000)

/**
 * Read the playback length without decoding the whole file. Best effort: some
 * browsers report Infinity for a streamed container, and the record simply
 * omits durationSec in that case.
 */
const readDuration = (file: File): Promise<number | undefined> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()

    const finish = (value?: number) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }

    audio.addEventListener("loadedmetadata", () => {
      const seconds = audio.duration
      finish(Number.isFinite(seconds) ? Math.round(seconds) : undefined)
    })
    audio.addEventListener("error", () => finish(undefined))

    audio.preload = "metadata"
    audio.src = url
  })

export const useAudioUpload = ({
  did,
  notePath,
  noteContent
}: {
  did: MaybeRef
  notePath: MaybeRef
  noteContent: MaybeRef
}) => {
  const attachAudio = async (
    file: File
  ): Promise<{ markdown: string } | null> => {
    const path = toValue(notePath)
    const authorDid = toValue(did)
    if (!path || !authorDid) {
      errorMessage("❌ Audio upload failed")
      return null
    }

    if (!file.type.startsWith("audio/")) {
      errorMessage("❌ That file isn't audio")
      return null
    }

    if (file.size > MAX_RECORDING_BYTES) {
      errorMessage(
        `❌ Audio is ${megabytes(file.size)}MB, over the ${megabytes(
          MAX_RECORDING_BYTES
        )}MB limit. Re-encode it: ffmpeg -i in.wav -c:a aac -b:a 64k -ac 1 out.m4a`
      )
      return null
    }

    const title = noteTitleForAlt(toValue(noteContent) ?? "", path)
    const durationSec = await readDuration(file)

    const atUri = await uploadRecording({
      did: authorDid,
      file,
      title,
      durationSec
    })
    if (!atUri) {
      errorMessage("❌ Audio upload failed")
      return null
    }

    return { markdown: `![${title}](${atUri})` }
  }

  return { attachAudio }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/hooks/useAudioUpload.hook.spec.ts`
Expected: PASS, five cases.

If the duration tests hang, jsdom's `HTMLMediaElement` never fires `loadedmetadata`. The `error` listener covers it, but if neither fires, add this to the spec's `beforeEach`:

```ts
    vi.stubGlobal(
      "Audio",
      class {
        preload = ""
        duration = NaN
        addEventListener(event: string, handler: () => void) {
          if (event === "loadedmetadata") setTimeout(handler, 0)
        }
        set src(_value: string) {}
      }
    )
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => {}
    })
```

- [ ] **Step 5: Commit**

```bash
pnpm lint && pnpm types
git add src/hooks/useAudioUpload.hook.ts src/hooks/useAudioUpload.hook.spec.ts
git commit -m "feat(notes): validate and upload audio attachments"
```

---

### Task 9: Toolbar button in `StackedNote.vue`

**Files:**
- Modify: `src/components/StackedNote.vue`

**Interfaces:**
- Consumes: `useAudioUpload` (Task 8), the existing `useATProtoLogin` hook (exposes `did` and `isLoggedIn`).
- Produces: nothing downstream.

The button mirrors the image button at `src/components/StackedNote.vue:509-550`, with two extra gates: the note must be `*.pub.md`, and there must be an ATProto session. PDS blobs are public and the recording record hits the firehose, so the entry point stays on notes that are already public.

- [ ] **Step 1: Add the script-block wiring**

In `src/components/StackedNote.vue`, add the imports beside the existing hook imports:

```ts
import { useATProtoLogin } from "@/hooks/useATProtoLogin.hook"
import { useAudioUpload } from "@/hooks/useAudioUpload.hook"
```

After the existing `useImageUpload` call (currently line 137-141), add:

```ts
const { did: atprotoDid, isLoggedIn: isATProtoLoggedIn } = useATProtoLogin()

// PDS blobs are served without auth and the recording record is broadcast on
// the firehose, so audio attached to a private note would be public anyway.
// Keeping the button on *.pub.md notes removes the trap instead of warning
// about it.
const isPublishedNote = computed(() => !!path.value?.endsWith(".pub.md"))
const canAttachAudio = computed(
  () => isPublishedNote.value && isATProtoLoggedIn.value
)

// Pass the ref, not its value: the ATProto session restores asynchronously
// after mount, so a value read here would still be empty at click time.
const { attachAudio } = useAudioUpload({
  did: () => atprotoDid.value ?? undefined,
  notePath: path,
  noteContent: rawContent
})

const audioInput = ref<HTMLInputElement | null>(null)

const onAudioPicked = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file || !path.value) return
  isUploading.value = true
  try {
    const result = await attachAudio(file)
    if (!result) return
    const trimmed = rawContent.value.replace(/\n+$/, "")
    const prefix = trimmed ? `${trimmed}\n\n` : ""
    rawContent.value = `${prefix}${result.markdown}\n`
    editKey.value++
  } finally {
    isUploading.value = false
  }
}
```

Confirm `computed` and `ref` are already in the `vue` import at the top of the file; add whichever is missing.

- [ ] **Step 2: Add the button and the input to the template**

In `src/components/StackedNote.vue`, immediately after the hidden image `<input>` (currently ending at line 550), add:

```vue
        <button
          v-if="isMarkdown && mode === 'edit' && canPush && canAttachAudio"
          class="action button is-text is-light"
          :title="isUploading ? 'Uploading…' : 'Attach audio'"
          :disabled="isUploading"
          @click="audioInput?.click()"
        >
          <span
            v-if="isUploading"
            class="loading loading-spinner loading-sm"
          ></span>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-music-plus"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 17a3 3 0 1 0 -6 0a3 3 0 0 0 6 0" />
            <path d="M12 17v-13h7v4h-7" />
            <path d="M16 19h6" />
            <path d="M19 16v6" />
          </svg>
        </button>
        <input
          ref="audioInput"
          type="file"
          accept="audio/*"
          class="hidden-input"
          @change="onAudioPicked"
        />
```

- [ ] **Step 3: Verify the suite still passes**

Run: `pnpm test && pnpm lint && pnpm types`
Expected: PASS.

- [ ] **Step 4: Smoke test in the running app**

Run: `pnpm dev`

1. Sign in to both GitHub and ATProto.
2. Open a `*.pub.md` note in edit mode. The music-plus button appears beside the photo button.
3. Open a plain `*.md` note. The button is absent.
4. Sign out of ATProto. The button is absent on the `.pub.md` note too.
5. Back on the `.pub.md` note, signed in, attach a small `.m4a`. The line appends with the note title in the alt slot.
6. Save, reload. The player renders, shows the title and duration, and plays.
7. Try a file over 50MB. It is rejected before any upload with the `ffmpeg` hint.
8. Open the record in a PDS viewer (`https://pdsls.dev/at://<did>/space.remanso.recording`) and confirm the blob is referenced.
9. Publish the note and open `/notes/:did/:rkey`. The same player renders.

- [ ] **Step 5: Commit**

```bash
git add src/components/StackedNote.vue
git commit -m "feat(notes): attach audio to published notes from the toolbar"
```

---

## Self-Review Notes

Spec coverage check against `docs/superpowers/specs/2026-08-01-atproto-audio-design.md`:

| Spec section | Task |
| --- | --- |
| Lexicon | 1 |
| Publishing the lexicon (goat, DNS) | Manual operator steps, called out in Task 1 |
| The link / at-uri format | 4, 8 |
| Alt-text derivation | 7 |
| Data flow — write | 6, 8, 9 |
| Data flow — read | 3, 5 |
| Rendering / post-render hydration | 4, 5 |
| Components table (`remanso`) | 2-9 |
| Components table (`remanso-jetstream`) | 1 |
| Components (`remanso-cli`) | None, by design |
| Failure handling table | 3 (read failures), 6 (write failures), 8 (validation), 9 (gating) |
| Testing | Every task |

One deviation from the spec, already flagged above: `useATProtoLogin.hook.ts` is not modified. `BrowserOAuthClient.restore(did)` re-derives the session, so Task 6 adds `getActiveSession(did)` to the OAuth service instead. Update the spec's component table when this lands.

Phase 2 (in-app mic) reuses Tasks 1-7 unchanged. It needs a capture component, chunked persistence to IndexedDB for crash recovery, and a second entry point calling the same `uploadRecording`.

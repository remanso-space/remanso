import { beforeEach, describe, expect, it, vi } from "vitest"
import { page } from "vitest/browser"
import { render } from "vitest-browser-vue"
import { createMemoryHistory, createRouter } from "vue-router"

import { getAuthor } from "@/modules/atproto/getAuthor"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

import PublicNoteView from "./PublicNoteView.vue"

// Only the network is faked. PouchDB, the markdown post-render pass and mermaid
// all run for real here — the jsdom spec has to mock them because jsdom has no
// Worker, no IndexedDB and no layout for mermaid to measure.
vi.mock("@/modules/atproto/getAuthor", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAuthor: vi.fn()
}))
vi.mock("@/modules/atproto/resolveRecording", () => ({
  resolveRecording: vi.fn()
}))

const DID = "did:plc:abc"
const RKEY = "3xyz"
const RECORDING_URI = `at://${DID}/space.remanso.recording/${RKEY}`

const noteResponse = (content: string) => ({
  uri: `at://${DID}/space.remanso.note/${RKEY}`,
  cid: "bafyrei111",
  value: {
    $type: "space.remanso.note",
    title: "Ma 間",
    images: [],
    content,
    createdAt: "2026-05-12T10:00:00Z",
    publishedAt: "2026-05-12T10:00:00Z"
  }
})

const mountView = async (content: string) => {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => noteResponse(content)
  } as unknown as Response)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/pub/:shortDid/:rkey/:slug?",
        name: "PublicNoteView",
        component: { render: () => null }
      },
      {
        path: "/pub/:shortDid",
        name: "PublicNoteListByDidView",
        component: { render: () => null }
      },
      { path: "/", name: "SpaceCowboy", component: { render: () => null } }
    ]
  })
  await router.push(`/pub/${DID}/${RKEY}`)
  await router.isReady()

  return render(PublicNoteView, {
    props: { shortDid: DID, rkey: RKEY },
    global: { plugins: [router] }
  })
}

describe("PublicNoteView end to end", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(resolveRecording).mockResolvedValue(null)
  })

  it("paints the note the PDS answered", async () => {
    await mountView("## Un titre\n\nDu texte.\n")

    await expect
      .element(page.getByRole("heading", { level: 1, name: "Ma 間" }))
      .toBeVisible()
    await expect
      .element(page.getByRole("heading", { name: "Un titre" }))
      .toBeVisible()
  })

  it.skipIf(import.meta.env.VITEST_CI)(
    "lays the note page out like the reference",
    async () => {
      await mountView("## Un titre\n\nDu texte, une ligne.\n")

      await expect.element(page.getByText("Du texte, une ligne.")).toBeVisible()
      await document.fonts.ready

      const article = page.elementLocator(
        document.querySelector<HTMLElement>(".public-note-view .note.article")!
      )
      await expect(article).toMatchScreenshot("public-note-page")
    }
  )

  it("plays the recording that shares the note's rkey", async () => {
    vi.mocked(resolveRecording).mockResolvedValue({
      blobUrl: "https://eurosky.social/xrpc/com.atproto.sync.getBlob?did=x",
      title: "Stream du 12 mai",
      durationSec: 3600
    })

    await mountView("Du texte sans at-uri.\n")

    await expect.element(page.getByText("Stream du 12 mai")).toBeVisible()

    // A real <audio> element with a real src — the jsdom spec can only read the
    // attribute back, this one gets a media element the browser accepted.
    await vi.waitFor(() => {
      const audio = document.querySelector<HTMLAudioElement>(
        ".recording-player audio"
      )
      expect(audio?.src).toContain("com.atproto.sync.getBlob")
    })
  })
})

import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import { getAuthor } from "@/modules/atproto/getAuthor"
import type { ResolvedRecording } from "@/modules/atproto/recording.types"
import { resolveRecording } from "@/modules/atproto/resolveRecording"

import PublicNoteView from "./PublicNoteView.vue"

vi.mock("@/modules/atproto/getAuthor", () => ({
  getAuthor: vi.fn()
}))
vi.mock("@/modules/atproto/resolveRecording", () => ({
  resolveRecording: vi.fn()
}))
// The post-render pass drives mermaid, tikz and the inline recording mounts
// against the real DOM. None of that says anything about the fixed slot.
vi.mock("@/hooks/useMarkdownPostRender.hook", () => ({
  useMarkdownPostRender: vi.fn()
}))
vi.mock("@/utils/notif", () => ({
  confirmMessage: vi.fn(),
  errorMessage: vi.fn()
}))
// The view reaches local storage through the router and the ATProto session,
// and importing it for real spawns the PouchDB worker — jsdom has no Worker.
// Nothing in the recording slot touches storage.
vi.mock("@/data/data", () => ({
  data: {
    add: vi.fn(),
    update: vi.fn(),
    bulkUpdate: vi.fn(),
    remove: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    getOrCreate: vi.fn(),
    getAll: vi.fn().mockResolvedValue([])
  },
  generateId: vi.fn(() => "id")
}))

const DID = "did:plc:abc"
const RKEY = "3xyz"
const RECORDING_URI = `at://${DID}/space.remanso.recording/${RKEY}`

const RECORDING: ResolvedRecording = {
  blobUrl: "https://eurosky.social/xrpc/com.atproto.sync.getBlob?did=x",
  title: "Stream du 12 mai",
  durationSec: 3600
}

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
        path: "/notes/:shortDid/:rkey/:slug?",
        name: "PublicNoteView",
        component: { template: "<div />" }
      },
      {
        path: "/notes/:shortDid",
        name: "PublicNoteListByDidView",
        component: { template: "<div />" }
      },
      { path: "/", name: "SpaceCowboy", component: { template: "<div />" } }
    ]
  })
  await router.push(`/notes/${DID}/${RKEY}`)
  await router.isReady()

  const wrapper = mount(PublicNoteView, {
    props: { shortDid: DID, rkey: RKEY },
    global: { plugins: [router] }
  })

  await flushPromises()
  await flushPromises()

  return wrapper
}

/** Where each block sits in the note column, so order can be asserted. */
const slotIndexes = (html: Element) => {
  const children = Array.from(html.querySelector(".note.article")!.children)
  return {
    title: children.findIndex((el) => el.classList.contains("repo-title")),
    player: children.findIndex((el) =>
      el.classList.contains("recording-player")
    ),
    body: children.findIndex((el) => el.classList.contains("note-display"))
  }
}

describe("PublicNoteView recording slot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
    vi.mocked(getAuthor).mockReset()
    vi.mocked(getAuthor).mockResolvedValue({
      handle: "jean.example",
      pds: "https://eurosky.social"
    })
    vi.mocked(resolveRecording).mockReset()
    vi.mocked(resolveRecording).mockResolvedValue(null)
  })

  it("plays the recording sharing the note's rkey, between the title and the body", async () => {
    vi.mocked(resolveRecording).mockResolvedValue(RECORDING)

    const wrapper = await mountView("Some prose with no at-uri in it.\n")

    expect(resolveRecording).toHaveBeenCalledWith(RECORDING_URI)
    expect(wrapper.find("audio").attributes("src")).toBe(RECORDING.blobUrl)

    const { title, player, body } = slotIndexes(wrapper.element)
    expect(player).toBeGreaterThan(title)
    expect(player).toBeLessThan(body)
  })

  it("renders no slot when the note has no recording", async () => {
    const wrapper = await mountView("Some prose with no at-uri in it.\n")

    expect(wrapper.find(".recording-player").exists()).toBe(false)
    // Not even the player's alt-text fallback: a missing recording is the
    // normal case here, not a resolution failure worth showing.
    expect(wrapper.find(".recording-unavailable").exists()).toBe(false)
  })

  it("leaves the note its own placement when the markdown embeds the at-uri", async () => {
    vi.mocked(resolveRecording).mockResolvedValue(RECORDING)

    const wrapper = await mountView(
      `Intro.\n\n![Ma 間 - audio](${RECORDING_URI})\n\nOutro.\n`
    )

    expect(wrapper.find(".recording-player").exists()).toBe(false)
    // The inline placeholder is still in the body, where runRecordings mounts
    // the one player the note asked for, at the spot the author chose.
    expect(
      wrapper
        .find(`.note-display .recording-block[data-at-uri="${RECORDING_URI}"]`)
        .exists()
    ).toBe(true)
  })
})

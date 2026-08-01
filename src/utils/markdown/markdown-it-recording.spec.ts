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

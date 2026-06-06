import MarkdownIt from "markdown-it"
import { describe, expect, it } from "vitest"

import { html5Media } from "./markdown-html5-media"

const renderer = () => MarkdownIt().use(html5Media)

describe("html5Media plugin", () => {
  it("renders <video> for .mp4 links using image syntax", () => {
    const html = renderer().render("![demo](movie.mp4)")
    expect(html).toContain('<video src="movie.mp4"')
    expect(html).toContain("</video>")
  })

  it("renders <audio> for .mp3 links using image syntax", () => {
    const html = renderer().render("![demo](song.mp3)")
    expect(html).toContain('<audio src="song.mp3"')
    expect(html).toContain("</audio>")
  })

  it("renders <img> for unrecognized extensions", () => {
    const html = renderer().render("![alt](pic.png)")
    expect(html).toContain('<img src="pic.png"')
    expect(html).not.toContain("<video")
    expect(html).not.toContain("<audio")
  })

  it("recognizes all listed video extensions", () => {
    for (const ext of ["mp4", "m4v", "ogv", "webm", "mpg", "mpeg"]) {
      expect(renderer().render(`![v](clip.${ext})`)).toContain(
        `<video src="clip.${ext}"`
      )
    }
  })

  it("recognizes all listed audio extensions", () => {
    for (const ext of ["aac", "m4a", "mp3", "oga", "ogg", "wav"]) {
      expect(renderer().render(`![a](sound.${ext})`)).toContain(
        `<audio src="sound.${ext}"`
      )
    }
  })

  it("includes a title attribute when provided in image syntax", () => {
    const html = renderer().render('![demo](movie.mp4 "My title")')
    expect(html).toContain('title="My title"')
  })

  it("matches extensions case-insensitively", () => {
    expect(renderer().render("![v](CLIP.MP4)")).toContain(
      '<video src="CLIP.MP4"'
    )
  })
})

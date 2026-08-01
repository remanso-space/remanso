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

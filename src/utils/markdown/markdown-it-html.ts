import type MarkdownIt from "markdown-it"
import { HTML_TAG_RE } from "markdown-it/lib/common/html_re.mjs"
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs"

// READMEs written for GitHub reach for raw HTML when markdown can't carry what
// they want — an `<img>` with a width, a `<p align="center">` wrapping a logo.
// `html: false` escapes all of it into visible tag soup, so instead: render the
// allowlisted tags and prune the rest, keeping their text content.
//
// Allowlisted tags are rebuilt, never echoed: the note comes from an arbitrary
// repo and lands in `v-html` unsanitized, so `onerror=` has to die here.
const IMG = /^<img(?=[\s/>])/i
const ATTR =
  /([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'`=<>]+))?/g
const SCHEME = /^[a-z][a-z0-9+.-]*:/i
const SAFE_SCHEME = /^(?:https?:|data:image\/)/i
const DIMENSION = /^\d+(?:px|%)?$/

const unquote = (value: string): string =>
  (value.startsWith('"') && value.endsWith('"')) ||
  (value.startsWith("'") && value.endsWith("'"))
    ? value.slice(1, -1)
    : value

// Relative paths stay: useImages rewrites them to the repo blob after render.
const isSafeSrc = (src: string): boolean =>
  SCHEME.test(src) ? SAFE_SCHEME.test(src) : src.length > 0

const buildImg = (md: MarkdownIt, tag: string): string | null => {
  // HTML_TAG_RE already validated the tag, so drop `<img` and `>` by position
  // rather than by regex — an attribute value may itself hold a `>`.
  const rawAttrs = tag.slice(4, -1).replace(/\/$/, "")
  const attrs = new Map<string, string>()

  for (const match of rawAttrs.matchAll(ATTR)) {
    const name = match[1].toLowerCase()
    const value = unquote(match[2] ?? "").trim()

    switch (name) {
      case "src":
      case "alt":
      case "title":
        attrs.set(name, value)
        break
      case "width":
      case "height":
        if (DIMENSION.test(value)) attrs.set(name, value)
        break
      default:
        break
    }
  }

  const src = attrs.get("src")
  if (!src || !isSafeSrc(src)) return null

  const serialized = [...attrs]
    .map(([name, value]) => ` ${name}="${md.utils.escapeHtml(value)}"`)
    .join("")

  return `<img${serialized}>`
}

export const markdownItHtml = (md: MarkdownIt) => {
  const rule = (state: StateInline, silent: boolean): boolean => {
    if (state.src.charCodeAt(state.pos) !== 0x3c /* < */) return false

    // Same recognition as the html_inline rule this replaces, so a bare `<` in
    // prose (`a < b`, `<3`) is still plain text and `<https://x>` autolinks.
    const match = HTML_TAG_RE.exec(state.src.slice(state.pos, state.posMax))
    if (!match) return false

    const tag = IMG.test(match[0]) ? buildImg(md, match[0]) : null
    if (tag && !silent) {
      state.push("html_inline", "", 0).content = tag
    }

    state.pos += match[0].length
    return true
  }

  md.inline.ruler.before("html_inline", "html_allowlist", rule)
}

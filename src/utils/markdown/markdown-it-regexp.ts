import MarkdownIt, { PluginSimple } from "markdown-it"

let counter = 0

export const markdownItPlugin = (
  regex: RegExp,
  replacer: (matches: RegExpExecArray[]) => string
): PluginSimple => {
  const id = "regexp-" + counter
  counter++
  const flags =
    (regex.global ? "g" : "") +
    (regex.multiline ? "m" : "") +
    (regex.ignoreCase ? "i" : "")

  const regexp = RegExp("^" + regex.source, flags)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parse = (state: any, silent: boolean): boolean => {
    const match = regexp.exec(state.src.slice(state.pos))

    if (!match) {
      return false
    }

    // valid match found, now we need to advance cursor
    state.pos += match[0].length

    // don't insert any tokens in silent mode
    if (silent) {
      return true
    }

    const token = state.push(id, "", 0)
    token.meta = { match }

    return true
  }

  const render = (
    tokens: { meta: { match: RegExpExecArray[] } }[],
    id: number
  ) => {
    return replacer(tokens[id].meta.match)
  }

  return (md: MarkdownIt) => {
    md.inline.ruler.push(id, parse)

    md.renderer.rules[id] = render
  }
}

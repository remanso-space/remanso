import type { MarkdownIt, RendererRule } from "markdown-it"

/**
 * Build a markdown-it plugin that renders the fences of one language itself and
 * lets every other fence fall through to whichever renderer is already in
 * place, so several of these can be chained without shadowing each other.
 */
export const fenceRenderer =
  (language: string, render: (content: string, md: MarkdownIt) => string) =>
  (md: MarkdownIt) => {
    const defaultFence: RendererRule =
      md.renderer.rules.fence ||
      ((tokens, index, options, _env, self) =>
        self.renderToken(tokens, index, options))

    md.renderer.rules.fence = (tokens, index, options, env, self) => {
      const token = tokens[index]

      if (token.info.trim() === language) {
        return render(token.content, md)
      }

      return defaultFence(tokens, index, options, env, self)
    }
  }

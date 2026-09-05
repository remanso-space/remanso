import MarkdownIt, { Options } from "markdown-it"
import Renderer from "markdown-it/lib/renderer.mjs"
import type Token from "markdown-it/lib/token.mjs"

/**
 * Build a markdown-it plugin that renders the fences of one language itself and
 * lets every other fence fall through to whichever renderer is already in
 * place, so several of these can be chained without shadowing each other.
 */
export const fenceRenderer =
  (language: string, render: (content: string, md: MarkdownIt) => string) =>
  (md: MarkdownIt) => {
    const defaultFence =
      md.renderer.rules.fence ||
      function (
        tokens: Array<Token>,
        index: number,
        options: Options,
        _: unknown,
        self: Renderer
      ) {
        return self.renderToken(tokens, index, options)
      }

    md.renderer.rules.fence = function (
      tokens: Array<Token>,
      index: number,
      options: Options,
      env: unknown,
      self: Renderer
    ) {
      const token = tokens[index]

      if (token.info.trim() === language) {
        return render(token.content, md)
      }

      return defaultFence(tokens, index, options, env, self)
    }
  }

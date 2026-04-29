import type { MarkdownItTabData, MarkdownItTabInfo } from "@mdit/plugin-tab"
import { tab } from "@mdit/plugin-tab"
import markdownItKatex from "@vscode/markdown-it-katex"
import GithubSlugger from "github-slugger"
import MarkdownIt, { Options } from "markdown-it"
import Renderer, { type RenderRuleRecord } from "markdown-it/lib/renderer.mjs"
import type Token from "markdown-it/lib/token.mjs"
import markdownItAnchor from "markdown-it-anchor"
import blockEmbedPlugin from "markdown-it-block-embed"
import markdownItCheckbox from "markdown-it-checkbox"
import MarkdownItGitHubAlerts from "markdown-it-github-alerts"
import markdownItIframe from "markdown-it-iframe"
import Shikiji from "markdown-it-shikiji"
import type { LanguageRegistration } from "shikiji-core"
import mermaid from "mermaid"
import { Ref, toValue } from "vue"

import alloyGrammar from "@/utils/alloy.tmLanguage.json"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"
import { html5Media } from "@/utils/markdown/markdown-html5-media"
import { markdownItTablerIcons } from "@/utils/markdown/markdown-it-tabler-icons"

const markdownItMermaidExtractor = (md: MarkdownIt) => {
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

    if (token.info.trim() === "mermaid") {
      const content = token.content.trim()
      return `<pre class="mermaid">\n${md.utils.escapeHtml(content)}\n</pre>\n`
    }

    return defaultFence(tokens, index, options, env, self)
  }
}

const slugger = new GithubSlugger()

let tabGroupCounter = 0
let currentTabGroup = 0
let currentTabActiveSet = false

const md = new MarkdownIt({
  typographer: true,
  quotes: ["«\xA0", "\xA0»", "‹\xA0", "\xA0›"]
})
  .use(markdownItMermaidExtractor)
  .use(html5Media)
  .use(blockEmbedPlugin, {
    youtube: {
      width: "100%",
      height: 300
    }
  })
  .use(markdownItCheckbox)
  .use(markdownItKatex)
  .use(markdownItIframe, {
    width: "100%"
  })
  .use(MarkdownItGitHubAlerts)
  .use(markdownItTablerIcons)
  .use(tab, {
    name: "tabs",
    openRender: (info: MarkdownItTabInfo) => {
      currentTabGroup = ++tabGroupCounter
      currentTabActiveSet = info.active >= 0
      return '<div class="tabs tabs-box">\n'
    },
    closeRender: () => "</div>\n",
    tabOpenRender: (data: MarkdownItTabData) => {
      const isChecked =
        data.isActive || (!currentTabActiveSet && data.index === 0)
      const checked = isChecked ? " checked" : ""
      const title = data.title.replace(/"/g, "&quot;")
      return `<input type="radio" name="md-tabs-${currentTabGroup}" class="tab" aria-label="${title}"${checked}>\n<div class="tab-content bg-base-100 border-base-300 rounded-box p-2">\n`
    },
    tabCloseRender: () => "</div>\n"
  })
  .use(markdownItAnchor, {
    slugify: (s: string) => slugger.slug(s)
  })

let shikijiInitialized = false

export const useShikiji = async () => {
  if (shikijiInitialized) {
    return
  }

  shikijiInitialized = true
  md.use(
    await Shikiji({
      themes: {
        light: "vitesse-light",
        dark: "vitesse-black"
      },
      langs: [
        "bash",
        "javascript",
        "typescript",
        "markdown",
        "mermaid",
        "html",
        "css",
        "json",
        {
          ...alloyGrammar,
          name: "alloy",
          aliases: ["als"]
        } as unknown as LanguageRegistration
      ]
    })
  )
}

let mermaidInitialized = false

export const runMermaid = (querySelector: string) => {
  if (!mermaidInitialized) {
    mermaidInitialized = true
    mermaid.initialize({
      theme: "dark",
      startOnLoad: false,
      flowchart: { curve: "natural" }
    })
  }

  mermaid.run({
    querySelector
  })
}

const rules: RenderRuleRecord = {
  table_open: () =>
    '<div class="overflow-x-auto"><table class="table table-zebra">',
  table_close: () => "</table></div>"
}

md.renderer.rules = { ...md.renderer.rules, ...rules }

const stripFrontmatter = (content: string): string => {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? content.slice(match[0].length) : content
}

const renderMarkdown = (content: string, env?: Record<string, unknown>) => {
  slugger.reset()
  return env ? md.render(content, env) : md.render(content)
}

export const renderCodeFile = async ({
  rawContent,
  lang,
  filename
}: {
  rawContent: string
  lang: string | null
  filename?: string
}): Promise<string> => {
  await useShikiji()
  const heading = filename ? `# ${filename}\n\n` : ""
  if (lang !== null) {
    return renderMarkdown(`${heading}\`\`\`\`${lang}\n${rawContent}\n\`\`\`\``)
  }
  return `${renderMarkdown(heading)}<pre><code>${md.utils.escapeHtml(rawContent)}</code></pre>`
}

export const markdownBuilder = (defaultPrefix?: Ref<string> | string) => {
  const getRawContent = (content: string) => decodeBase64ToUTF8(content)
  const renderFromUTF8 = (content: string, prefix?: string) => {
    return content
      ? renderMarkdown(stripFrontmatter(content), {
          docId: defaultPrefix ? toValue(defaultPrefix) : (prefix ?? "")
        })
      : ""
  }

  return {
    toHTML: (content: string) =>
      content ? renderMarkdown(stripFrontmatter(content)) : "",
    render: (content: string, prefix?: string) =>
      renderFromUTF8(decodeBase64ToUTF8(content), prefix),
    renderFromUTF8,
    getRawContent
  }
}

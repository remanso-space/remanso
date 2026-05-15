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
import mermaid from "mermaid"
import type { LanguageRegistration } from "shikiji-core"
import { Ref, toValue } from "vue"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import type { TikzCache } from "@/data/models/TikzCache"
import alloyGrammar from "@/utils/alloy.tmLanguage.json"
import {
  decodeBase64ToUTF8,
  encodeUTF8ToBase64
} from "@/utils/decodeBase64ToUTF8"
import { html5Media } from "@/utils/markdown/markdown-html5-media"
import { markdownItTablerIcons } from "@/utils/markdown/markdown-it-tabler-icons"

const TIKZ_BUNDLE_URL =
  "https://cdn.jsdelivr.net/gh/artisticat1/obsidian-tikzjax@0.5.2/tikzjax.js"
const TIKZ_STYLES_URL =
  "https://cdn.jsdelivr.net/gh/artisticat1/obsidian-tikzjax@0.5.2/styles.css"
const TIKZ_RENDER_TIMEOUT_MS = 30000

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

const markdownItTikzExtractor = (md: MarkdownIt) => {
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

    if (token.info.trim() === "tikz") {
      const encoded = encodeUTF8ToBase64(token.content)
      return `<pre class="tikz" data-tikz-source="${encoded}"><span class="tikz-loading">Rendering TikZ…</span></pre>\n`
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
  .use(markdownItTikzExtractor)
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

let shikijiPromise: Promise<void> | null = null

export const useShikiji = (): Promise<void> => {
  if (!shikijiPromise) {
    shikijiPromise = Shikiji({
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
    }).then((plugin) => {
      md.use(plugin)
    })
  }
  return shikijiPromise
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

let tikzBundlePromise: Promise<void> | null = null
let tikzStylesPromise: Promise<void> | null = null
let domPurifyPromise: Promise<typeof import("dompurify")> | null = null

const ensureTikzBundle = (): Promise<void> => {
  if (tikzBundlePromise) return tikzBundlePromise

  tikzBundlePromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("tikzjax-bundle")
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.id = "tikzjax-bundle"
    script.src = TIKZ_BUNDLE_URL
    script.async = true
    script.crossOrigin = "anonymous"
    script.addEventListener("load", () => resolve())
    script.addEventListener("error", () => {
      tikzBundlePromise = null
      reject(new Error("Failed to load TikZ engine"))
    })
    document.head.appendChild(script)
  })

  return tikzBundlePromise
}

const ensureTikzStyles = (): Promise<void> => {
  if (tikzStylesPromise) return tikzStylesPromise

  tikzStylesPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("tikzjax-styles")
    if (existing) {
      resolve()
      return
    }
    const link = document.createElement("link")
    link.id = "tikzjax-styles"
    link.rel = "stylesheet"
    link.href = TIKZ_STYLES_URL
    link.crossOrigin = "anonymous"
    link.addEventListener("load", () => resolve())
    link.addEventListener("error", () => {
      tikzStylesPromise = null
      reject(new Error("Failed to load TikZ font styles"))
    })
    document.head.appendChild(link)
  })

  return tikzStylesPromise
}

const ensureDomPurify = (): Promise<typeof import("dompurify")> => {
  if (!domPurifyPromise) domPurifyPromise = import("dompurify")
  return domPurifyPromise
}

const sha256Hex = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const sanitizeSvg = async (svg: string): Promise<string> => {
  const DOMPurify = (await ensureDomPurify()).default
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true }
  })
}

const tidyTikzSource = (s: string): string =>
  s
    .replaceAll("&nbsp;", "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .join("\n")

const renderTikzError = (err: unknown, source: string): string => {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    `<div class="tikz-error"><strong>TikZ error</strong>` +
    `<pre>${md.utils.escapeHtml(msg)}</pre>` +
    `<details><summary>source</summary>` +
    `<pre>${md.utils.escapeHtml(source)}</pre></details></div>`
  )
}

const renderOneTikzBlock = (
  el: HTMLElement,
  source: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      el.removeEventListener("tikzjax-load-finished", handler)
      reject(new Error("TikZ render timed out"))
    }, TIKZ_RENDER_TIMEOUT_MS)

    const handler = (e: Event) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      el.removeEventListener("tikzjax-load-finished", handler)
      const target = e.target as Element | null
      if (!target) {
        reject(new Error("TikZ produced no output"))
        return
      }
      resolve(target.outerHTML)
    }

    el.addEventListener("tikzjax-load-finished", handler)

    while (el.firstChild) el.removeChild(el.firstChild)
    const script = document.createElement("script")
    script.type = "text/tikz"
    script.textContent = source
    el.appendChild(script)
  })
}

export const runTikz = async (querySelector: string): Promise<void> => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(querySelector)
  )
  if (elements.length === 0) return

  void ensureTikzStyles().catch(() => undefined)

  await Promise.all(
    elements.map(async (el) => {
      if (el.dataset.tikzRendered) return
      el.dataset.tikzRendered = "pending"

      const encoded = el.dataset.tikzSource
      if (!encoded) {
        el.dataset.tikzRendered = "error"
        return
      }

      const source = tidyTikzSource(decodeBase64ToUTF8(encoded))

      let hash: string
      try {
        hash = await sha256Hex(source)
      } catch (err) {
        el.innerHTML = renderTikzError(err, source)
        el.dataset.tikzRendered = "error"
        return
      }

      const cacheId = `${DataType.TikzCache}-${hash}`
      const cached = await data.get<DataType.TikzCache, TikzCache>(cacheId)
      if (cached?.svg) {
        el.innerHTML = cached.svg
        el.dataset.tikzRendered = "true"
        return
      }

      try {
        await ensureTikzBundle()
        const rawSvg = await renderOneTikzBlock(el, source)
        const sanitized = await sanitizeSvg(rawSvg)
        el.innerHTML = sanitized
        el.dataset.tikzRendered = "true"
        void data.add<DataType.TikzCache>({
          _id: cacheId,
          $type: DataType.TikzCache,
          svg: sanitized
        } as TikzCache)
      } catch (err) {
        el.innerHTML = renderTikzError(err, source)
        el.dataset.tikzRendered = "error"
      }
    })
  )
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

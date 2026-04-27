const EXT_TO_LANG: Record<string, string> = {
  sh: "bash",
  bash: "bash",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  md: "markdown",
  mdx: "markdown",
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  json: "json",
  jsonc: "json",
  als: "alloy"
}

const MARKDOWN_EXTS = new Set(["md", "mdx"])

export function isMarkdownPath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return MARKDOWN_EXTS.has(ext)
}

export function getFileLanguage(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return EXT_TO_LANG[ext] ?? null
}

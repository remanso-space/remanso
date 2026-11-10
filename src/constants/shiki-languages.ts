import type { BundledLanguage } from "shiki/langs"

/**
 * Grammars loaded with the highlighter and precached by the service worker.
 * Any other fence language is fetched the first time a note uses it, and
 * vite.config.mts keeps those chunks out of the precache.
 *
 * Canonical ids only: an alias such as `bash` is its own module re-exporting
 * `shellscript`, so naming it here would leave the real grammar's chunk
 * unprecached.
 */
export const PRELOADED_SHIKI_LANGUAGES = [
  "shellscript",
  "javascript",
  "typescript",
  "tsx",
  "markdown",
  "mermaid",
  "html",
  "css",
  "json",
  "rust"
] as const satisfies readonly BundledLanguage[]

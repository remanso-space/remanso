const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

/**
 * Calm degradation for a note that failed to render: never a raw error dump
 * or a silent blank — show the note's raw text (escaped) with a gentle notice,
 * so the content is still readable.
 */
export const renderFallback = (content: string): string =>
  `<div class="note-render-fallback"><p><em>This note couldn't be fully rendered — showing its raw text.</em></p><pre>${escapeHtml(content)}</pre></div>`

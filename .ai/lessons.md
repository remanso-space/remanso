# Lessons

- **Lean vocabulary (from Jean, 2026-07-26)**: "takt time" = time to ship one
  unit (one product every X minutes); "takt" = the inverse rate (N products
  per hour). Never alias them as synonyms. Jean is a lean coach — treat lean
  terms in his notes as precise domain language, verify before reusing.

- **Accent color**: never `text-accent` / `var(--color-accent)` for text or icons.
  Use `--link-accent` (`src/styles/app.css`) — contrast-safe on every theme.
  Utility form: `text-(--link-accent)`. Learned 2026-07-26 after shipping
  instrument buttons with raw `text-accent`; project already had the fixed
  variable, should have grepped `app.css` for accent handling before styling.

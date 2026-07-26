# Lessons

- **Accent color**: never `text-accent` / `var(--color-accent)` for text or icons.
  Use `--link-accent` (`src/styles/app.css`) — contrast-safe on every theme.
  Utility form: `text-(--link-accent)`. Learned 2026-07-26 after shipping
  instrument buttons with raw `text-accent`; project already had the fixed
  variable, should have grepped `app.css` for accent handling before styling.

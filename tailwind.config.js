/** @type {import('tailwindcss').Config} */
const dotenv = require("dotenv")

dotenv.config()

const defaultHeadingStyles = Array.from(
  { length: 6 },
  (_, k) => `h${k + 1}`
).reduce(
  (acc, heading) => ({
    ...acc,
    [heading]: {
      "margin-top": "0",
      "margin-bottom": "0.5em",
      "font-family": "var(--heading-font-family)"
    }
  }),
  {}
)

const BOX_SHADOW = "6px"

module.exports = {
  content: ["./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      typography: () => ({
        DEFAULT: {
          css: {
            ...defaultHeadingStyles,
            "font-size": "13pt",
            "font-family": '"Libertinus Serif", serif',
            p: {
              "margin-top": "0.8em",
              "margin-bottom": "0.8em",
              "text-align": "left"
              // "text-wrap": "balance",
            },
            "img, video": {
              margin: "auto",
              "border-radius": "0.5rem",
              "box-shadow":
                "rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px",
              "max-width": `calc(100% - 2 * ${BOX_SHADOW})`
            },
            a: {
              "font-weight": 600,
              // "text-decoration": "wavy underline var(--color-contrast-content)",
              // "text-decoration-thickness": "0.1em",
              "text-decoration": "none",
              // Readable-but-vivid accent, shared with header icons.
              // Defined in app.css (--link-accent): keeps the theme accent's
              // hue + chroma, pins lightness per light/dark so links stay
              // legible on any theme. Raw accent was unreadable (1.17:1 on
              // cmyk); this keeps full chroma at ~5.8:1.
              color: "var(--link-accent)"
            },
            "a.btn-primary": {
              color: "var(--color-secondary-content)"
            },
            "a:hover": {
              "text-decoration": "underline"
            },
            li: {
              "margin-top": 0,
              "margin-bottom": 0
            }
          }
        }
      })
    }
  }
}

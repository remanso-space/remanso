import "@/styles/app.css"

// The browser-mode harness serves its own page, so the theme index.html pins
// has to be set here for components to render with the real DaisyUI palette.
document.documentElement.dataset.theme = "emerald"

// app.css pulls its serif from Google Fonts. A screenshot taken while the font
// is still loading looks nothing like one taken after, so tests awaiting
// document.fonts.ready before comparing pixels is not optional.

import { existsSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

import vue from "@vitejs/plugin-vue"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

// Where _scripts/install-browser-deps.sh vendors chromium's shared libraries
// when the machine has none and no root to apt-install them. Absent on CI and
// on a normal desktop, where the browser finds its libraries by itself.
const vendoredLibs =
  process.env.CHROMIUM_DEPS_DIR ??
  path.join(homedir(), ".local/share/chromium-deps")

if (existsSync(vendoredLibs)) {
  process.env.LD_LIBRARY_PATH = [
    path.join(vendoredLibs, "usr/lib/x86_64-linux-gnu"),
    path.join(vendoredLibs, "lib/x86_64-linux-gnu"),
    process.env.LD_LIBRARY_PATH
  ]
    .filter(Boolean)
    .join(":")
  // Without this, fontconfig searches the system directories, finds no font at
  // all, and chromium lays every string out with zero-width glyphs — text is
  // then invisible and every size assertion reads 0.
  process.env.FONTCONFIG_FILE = path.join(vendoredLibs, "fonts.conf")
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node-fetch": "isomorphic-fetch"
    }
  },
  // Screenshots depend on the font stack of the machine that took them, so the
  // reference images only hold on the machine that generated them. CI runs the
  // behaviour, this flag turns the pixel comparisons off there.
  define: {
    "import.meta.env.VITEST_CI": JSON.stringify(Boolean(process.env.CI))
  },
  test: {
    include: ["src/**/*.browser.spec.ts"],
    setupFiles: ["./src/test/browser.setup.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          // The headless shell is what install-browser-deps.sh downloads.
          channel: "chromium-headless-shell",
          // The container has no user namespaces for chromium's sandbox, and
          // the only code it loads is this repo's own test bundle.
          args: ["--no-sandbox"]
        }
      }),
      instances: [{ browser: "chromium" }],
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: { allowedMismatchedPixelRatio: 0.02 }
        }
      }
    }
  }
})

/// <reference types="vitest" />
import vue from "@vitejs/plugin-vue"
import path from "path"
import { defineConfig, type UserConfigExport } from "vite"
import { VitePWA } from "vite-plugin-pwa"

import { PRELOADED_SHIKI_LANGUAGES } from "./src/constants/shiki-languages"

const SHIKI_GRAMMAR = /@shikijs\/langs\/dist\/([^/]+)\.mjs$/
const SHIKI_LAZY_DIR = "shiki-langs"
const PRELOADED = new Set<string>(PRELOADED_SHIKI_LANGUAGES)

export default defineConfig(({ command }) => {
  const config: UserConfigExport = {
    build: {
      minify: "esbuild",
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          // Grammars fetched on first use get their own folder, so the service
          // worker can leave them out of the precache (see `workbox` below).
          // Judged on every module, not the facade: a grammar other grammars
          // embed (cpp, yaml…) becomes a shared chunk with no facade.
          chunkFileNames: ({ moduleIds }) => {
            const grammars = moduleIds.map((id) => id.match(SHIKI_GRAMMAR)?.[1])
            const lazy =
              grammars.length > 0 &&
              grammars.every((name) => name && !PRELOADED.has(name))
            return lazy
              ? `assets/${SHIKI_LAZY_DIR}/[name]-[hash].js`
              : "assets/[name]-[hash].js"
          }
        }
      }
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      // Browser-mode specs live next to their unit specs but need a browser to
      // run, so they belong to vitest.browser.config.mts alone.
      include: ["src/**/*.spec.ts"],
      exclude: ["**/node_modules/**", "src/**/*.browser.spec.ts"],
      globals: false,
      server: {
        deps: {
          // Externalised dependencies run outside the mock registry, so a test
          // mocking the OAuth SDK would not reach the copy this package imports
          // and a real BrowserOAuthClient would try to load in jsdom.
          inline: ["vue-atproto-login"]
        }
      }
    },
    plugins: [
      vue(),
      VitePWA({
        registerType: "prompt",
        workbox: {
          // ~200 grammars, 3MB no note may ever ask for: cache each one the
          // first time it is fetched instead.
          globIgnores: [`**/${SHIKI_LAZY_DIR}/**`],
          runtimeCaching: [
            {
              urlPattern: new RegExp(`/assets/${SHIKI_LAZY_DIR}/`),
              handler: "CacheFirst",
              options: { cacheName: SHIKI_LAZY_DIR }
            }
          ]
        },
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "apple-touch-icon-180x180.png",
          "favicon.png",
          "pwa-64x64.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
          "masked-icon.png",
          "maskable-icon-512x512.png",
          "monochromeicon.png",
          "assets/*.svg"
        ],
        manifest: {
          name: "Remanso",
          short_name: "Remanso",
          description: "Note taking & sharing app",
          background_color: "#ffa4c0",
          theme_color: "#ffa4c0",
          icons: [
            {
              src: "pwa-64x64.png",
              sizes: "64x64",
              type: "image/png"
            },
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "monochromeicon.png",
              sizes: "1024x1024",
              type: "image/png",
              purpose: "monochrome"
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "node-fetch": "isomorphic-fetch"
      }
    }
  }

  if (command === "serve") {
    config.define = {
      global: {}
    }
    config.server = {
      host: "127.0.0.1"
    }
  }

  return config
})

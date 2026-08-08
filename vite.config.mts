/// <reference types="vitest" />
import vue from "@vitejs/plugin-vue"
import path from "path"
import { defineConfig, type UserConfigExport } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig(({ command }) => {
  const config: UserConfigExport = {
    build: {
      minify: "esbuild",
      reportCompressedSize: false
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
        "@": path.resolve(__dirname, "./src"),
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

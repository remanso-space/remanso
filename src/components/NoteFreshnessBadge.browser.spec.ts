import { describe, expect, it, vi } from "vitest"
import { page } from "vitest/browser"
import { render } from "vitest-browser-vue"
import { h } from "vue"

import type { FreshnessStatus } from "@/hooks/useNoteFreshness.hook"

import NoteFreshnessBadge from "./NoteFreshnessBadge.vue"

// The spinner is left out: it animates forever, so a screenshot of it never
// settles. Its colour is the same as the unknown state anyway.
const STILL_STATUSES: FreshnessStatus[] = [
  "verified",
  "outdated",
  "offline",
  "unauthorized",
  "unknown"
]

describe("NoteFreshnessBadge in a real browser", () => {
  it("emits click on a real pointer click", async () => {
    const onClick = vi.fn()
    render(NoteFreshnessBadge, {
      props: { status: "verified", lastCheckedAt: null, onClick }
    })

    await page.getByRole("button").click()

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("colours each state from the theme, and dims the unknown one", async () => {
    render({
      render: () =>
        h("div", [
          h(NoteFreshnessBadge, {
            status: "verified",
            lastCheckedAt: null,
            class: "probe-verified"
          }),
          h(NoteFreshnessBadge, {
            status: "unknown",
            lastCheckedAt: null,
            class: "probe-unknown"
          })
        ])
    })

    // Resolving `color: var(--color-success)` down to a real colour needs a
    // browser: jsdom returns the unresolved var, so scss + DaisyUI theming is
    // exactly what unit tests cannot assert.
    const verified = getComputedStyle(
      document.querySelector(".probe-verified")!
    )
    const unknown = getComputedStyle(document.querySelector(".probe-unknown")!)

    expect(verified.color).toMatch(/^(rgb|oklch|color)/)
    expect(verified.color).not.toBe(unknown.color)
    expect(unknown.opacity).toBe("0.6")
  })

  it.skipIf(import.meta.env.VITEST_CI)(
    "looks the same as the reference for every state",
    async () => {
      render({
        render: () =>
          h(
            "div",
            {
              "data-testid": "freshness-states",
              style:
                "display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 8px; width: 220px; background: var(--color-base-100);"
            },
            STILL_STATUSES.map((status) =>
              h(NoteFreshnessBadge, { status, lastCheckedAt: null })
            )
          )
      })

      await document.fonts.ready

      await expect(page.getByTestId("freshness-states")).toMatchScreenshot(
        "freshness-states"
      )
    }
  )
})

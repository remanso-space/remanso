import { describe, expect, it } from "vitest"

import { renderFallback } from "./renderFallback"

describe("renderFallback", () => {
  it("shows the raw content inside a pre with a gentle notice", () => {
    const html = renderFallback("# hello")

    expect(html).toContain("note-render-fallback")
    expect(html).toContain("couldn't be fully rendered")
    expect(html).toContain("<pre># hello</pre>")
  })

  it("escapes HTML so raw content can't inject markup into v-html", () => {
    const html = renderFallback('<img src=x onerror="alert(1)"> & "q"')

    expect(html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &quot;q&quot;"
    )
    expect(html).not.toContain("<img src=x")
  })

  it("escapes ampersands before other entities", () => {
    expect(renderFallback("&lt;")).toContain("<pre>&amp;lt;</pre>")
  })
})

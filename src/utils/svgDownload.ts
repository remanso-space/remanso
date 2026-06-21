const ATTACHED_FLAG = "svgDownloadAttached"
const SVG_NS = "http://www.w3.org/2000/svg"

const TABLER_DOWNLOAD_ICON = `<svg xmlns="${SVG_NS}" class="icon icon-tabler icon-tabler-download" width="14" height="14" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/></svg>`

const stripQuotes = (s: string): string => s.trim().replace(/^["']|["']$/g, "")

const collectFontFamilies = (svg: SVGSVGElement): Set<string> => {
  const families = new Set<string>()
  const collect = (raw: string | null) => {
    if (!raw) return
    raw.split(",").forEach((part) => {
      const cleaned = stripQuotes(part)
      if (cleaned) families.add(cleaned)
    })
  }
  collect(svg.getAttribute("font-family"))
  svg.querySelectorAll<Element>("[font-family]").forEach((el) =>
    collect(el.getAttribute("font-family"))
  )
  return families
}

const isFontFaceRule = (rule: CSSRule): boolean => {
  if (typeof CSSFontFaceRule !== "undefined" && rule instanceof CSSFontFaceRule)
    return true
  return rule.cssText.trimStart().startsWith("@font-face")
}

const collectFontFaceCss = (families: Set<string>): string => {
  if (families.size === 0) return ""
  const parts: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (!rules) continue
    for (const rule of Array.from(rules)) {
      if (!isFontFaceRule(rule)) continue
      const styleRule = rule as CSSFontFaceRule
      const family = stripQuotes(
        styleRule.style?.getPropertyValue("font-family") ?? ""
      )
      if (family && families.has(family)) {
        parts.push(rule.cssText)
      }
    }
  }
  return parts.join("\n")
}

const getSvgPixelSize = (svg: SVGSVGElement): { width: number; height: number } => {
  const viewBox = svg.viewBox?.baseVal
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height }
  }
  const rect = svg.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height }
  }
  return { width: 800, height: 600 }
}

const buildExportableSvgString = (svg: SVGSVGElement): string => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", SVG_NS)
  if (!clone.getAttribute("xmlns:xlink"))
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink")

  const { width, height } = getSvgPixelSize(svg)
  const viewBox = svg.viewBox?.baseVal
  const originX = viewBox && viewBox.width > 0 ? viewBox.x : 0
  const originY = viewBox && viewBox.height > 0 ? viewBox.y : 0
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `${originX} ${originY} ${width} ${height}`)
  }
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))

  // Cover the full viewBox (its origin can be negative — e.g. a diagram whose
  // content extends above y=0), otherwise that content falls outside the fill.
  const bg = document.createElementNS(SVG_NS, "rect")
  bg.setAttribute("x", String(originX))
  bg.setAttribute("y", String(originY))
  bg.setAttribute("width", String(width))
  bg.setAttribute("height", String(height))
  bg.setAttribute("fill", "#ffffff")
  clone.insertBefore(bg, clone.firstChild)

  const fontFaceCss = collectFontFaceCss(collectFontFamilies(svg))
  if (fontFaceCss) {
    const style = document.createElementNS(SVG_NS, "style")
    style.setAttribute("type", "text/css")
    style.textContent = fontFaceCss
    clone.insertBefore(style, clone.firstChild)
  }

  return new XMLSerializer().serializeToString(clone)
}

export const svgToDataUrl = (svg: SVGSVGElement): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildExportableSvgString(svg))}`

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const downloadAsSvg = (svg: SVGSVGElement, filename: string): void => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${buildExportableSvgString(svg)}`
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
  triggerBlobDownload(blob, filename)
}

const downloadAsPng = async (
  svg: SVGSVGElement,
  filename: string,
  scale = 2
): Promise<void> => {
  const { width, height } = getSvgPixelSize(svg)
  const svgString = buildExportableSvgString(svg)
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Failed to load SVG for PNG export"))
      img.src = svgUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context unavailable")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!pngBlob) throw new Error("Failed to encode PNG")
    triggerBlobDownload(pngBlob, filename)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

const makeButton = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = "btn btn-xs btn-neutral svg-download-button"
  btn.title = title
  btn.setAttribute("aria-label", title)
  btn.innerHTML = `${TABLER_DOWNLOAD_ICON}<span>${label}</span>`
  btn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    onClick()
  })
  return btn
}

const RENDERED_DIAGRAM_SELECTOR = ".tikz svg, .mermaid svg"

export const attachSvgDownloads = (scope: ParentNode | null | undefined): void => {
  if (!scope) return
  const svgs = scope.querySelectorAll<SVGSVGElement>(RENDERED_DIAGRAM_SELECTOR)
  let index = 0
  svgs.forEach((svg) => {
    if (svg.closest(".svg-download-host")) return

    const host = document.createElement("span")
    host.className = "svg-download-host"
    if (svg.dataset) host.dataset[ATTACHED_FLAG] = "true"

    const parent = svg.parentNode
    if (!parent) return
    parent.insertBefore(host, svg)
    host.appendChild(svg)

    const toolbar = document.createElement("div")
    toolbar.className = "svg-download-buttons"

    const n = index++
    const baseName = `diagram-${n + 1}`
    toolbar.appendChild(
      makeButton("SVG", "Download SVG", () =>
        downloadAsSvg(svg, `${baseName}.svg`)
      )
    )
    toolbar.appendChild(
      makeButton("PNG ×3", "Download PNG (3×)", () => {
        void downloadAsPng(svg, `${baseName}.png`, 3)
      })
    )
    host.appendChild(toolbar)
  })
}

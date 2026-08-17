// Repo images are inlined as base64 data URLs. The MIME has to match the file:
// browsers sniff raster formats and forgive a wrong label, but never promote a
// data URL to SVG — an `.svg` served as `image/jpeg` renders as a broken image.
const MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp"
}

export const imageMimeType = (path: string): string => {
  const extension = path.split(".").pop()?.toLowerCase() ?? ""

  return MIME_BY_EXTENSION[extension] ?? "image/jpeg"
}

export const toImageDataUrl = (path: string, base64: string): string =>
  `data:${imageMimeType(path)};charset=utf-8;base64,${base64.replace(/\s/g, "")}`

import path from "path"
import sharp from "sharp"

// PWA spec: `purpose: "monochrome"` icons are *masks*. The user agent ignores
// RGB and uses only the alpha channel as the silhouette, then paints it with
// the platform theme color. So the source PNG must be RGBA with the silhouette
// in alpha, NOT a black-on-white RGB image.

const SRC = path.resolve(__dirname, "../public/favicon.png")
const OUT = path.resolve(__dirname, "../public/monochromeicon.png")
const SIZE = 1024

async function main() {
  const { data, info } = await sharp(SRC)
    .resize(SIZE, SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.channels !== 4)
    throw new Error(`expected RGBA, got ${info.channels} channels`)

  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    out[i] = 0
    out[i + 1] = 0
    out[i + 2] = 0
    out[i + 3] = data[i + 3]
  }

  await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT)

  console.log(`Wrote ${OUT} (${SIZE}x${SIZE} RGBA)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

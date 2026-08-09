/**
 * Shrink a picked image before it goes to GitHub.
 *
 * A phone camera hands back 10-25 MB for a single frame, and the contents API
 * takes it as base64, which is another third on top. On mobile data that is a
 * minute of uploading before GitHub answers — and the answer is often a
 * rejection, so the wait bought nothing. Re-encoding to something a note can
 * actually display turns that into a couple of seconds.
 */

/** What we aim for. A 2048px JPEG at this size is past what a note renders. */
const TARGET_BYTES = 1_000_000

/** Longest edge kept. Notes are read in a column narrower than this. */
const MAX_EDGE = 2048

/**
 * Tried in order until one fits the target; the last one is used regardless.
 * Dropping quality is cheaper than dropping pixels, so that goes first.
 */
const ATTEMPTS = [
  { edge: MAX_EDGE, quality: 0.82 },
  { edge: MAX_EDGE, quality: 0.65 },
  { edge: 1600, quality: 0.6 },
  { edge: 1280, quality: 0.55 },
  { edge: 1024, quality: 0.5 }
]

/**
 * Re-encoding these loses what makes them what they are — the animation, the
 * vector — so they go up as they came in.
 */
const LEAVE_ALONE = ["image/gif", "image/svg+xml"]

/** Backstop for a decoder wedging on a malformed file, so the button recovers. */
const HARD_TIMEOUT_MS = 30_000

const withTimeout = async <T>(
  work: Promise<T>,
  ms: number
): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const guard = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn("shrinkImageFile: gave up after", ms, "ms")
      resolve(null)
    }, ms)
  })

  try {
    return await Promise.race([work, guard])
  } finally {
    clearTimeout(timer)
  }
}

const encode = (
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))

const run = async (file: File): Promise<File | null> => {
  const bitmap = await createImageBitmap(file)

  try {
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) return null

    let encoded: Blob | null = null

    for (const { edge, quality } of ATTEMPTS) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))

      // A photo has no transparency to keep, and JPEG would render whatever is
      // left of the previous attempt underneath.
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      encoded = await encode(canvas, quality)
      if (!encoded) return null
      if (encoded.size <= TARGET_BYTES) break
    }

    if (!encoded) return null

    // Re-encoding a small image can make it bigger; the original is better then.
    if (encoded.size >= file.size) return null

    return new File([encoded], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg"
    })
  } finally {
    bitmap.close?.()
  }
}

/**
 * Returns null whenever the original should be uploaded as it is — already
 * small enough, a format we must not re-encode, or a decode the browser could
 * not do (an unusual camera format, say). The caller uploads what it had.
 */
export const shrinkImageFile = async (file: File): Promise<File | null> => {
  if (LEAVE_ALONE.includes(file.type)) return null
  if (file.size <= TARGET_BYTES) return null
  if (typeof createImageBitmap !== "function") return null

  try {
    return await withTimeout(run(file), HARD_TIMEOUT_MS)
  } catch (error) {
    console.warn("shrinkImageFile: leaving the file as it is", error)
    return null
  }
}

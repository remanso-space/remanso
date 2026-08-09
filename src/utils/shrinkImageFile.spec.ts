import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { shrinkImageFile } from "./shrinkImageFile"

const makeFile = (name: string, bytes: number, type = "image/jpeg") =>
  new File([new Uint8Array(bytes)], name, { type })

/**
 * jsdom has neither a decoder nor a canvas encoder, so both ends are stubbed:
 * the bitmap reports camera dimensions, and toBlob returns whatever size the
 * test wants for that quality.
 */
const stubCanvas = (sizeFor: (quality: number) => number) => {
  const close = vi.fn()
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 8160, height: 6120, close }))
  )

  const context = {
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn()
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (
      callback: (blob: Blob | null) => void,
      _type: string,
      quality: number
    ) => callback(new Blob([new Uint8Array(sizeFor(quality))]))
  }

  vi.spyOn(document, "createElement").mockReturnValue(
    canvas as unknown as HTMLElement
  )

  return { canvas, context, close }
}

describe("shrinkImageFile", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("leaves a file that is already small alone", async () => {
    const decode = vi.fn()
    vi.stubGlobal("createImageBitmap", decode)

    expect(await shrinkImageFile(makeFile("small.jpg", 500_000))).toBeNull()
    expect(decode).not.toHaveBeenCalled()
  })

  it("leaves an animation or a vector alone", async () => {
    const decode = vi.fn()
    vi.stubGlobal("createImageBitmap", decode)

    expect(
      await shrinkImageFile(makeFile("anim.gif", 4_000_000, "image/gif"))
    ).toBeNull()
    expect(
      await shrinkImageFile(makeFile("plot.svg", 4_000_000, "image/svg+xml"))
    ).toBeNull()
    expect(decode).not.toHaveBeenCalled()
  })

  it("re-encodes a camera photo down to a JPEG capped at 2048px", async () => {
    const { canvas } = stubCanvas(() => 400_000)

    const result = await shrinkImageFile(makeFile("PXL_1.jpg", 12_000_000))

    expect(result?.type).toBe("image/jpeg")
    expect(result?.name).toBe("PXL_1.jpg")
    expect(result?.size).toBe(400_000)
    expect(canvas.width).toBe(2048)
    expect(canvas.height).toBe(1536)
  })

  it("renames to .jpg when the source was not a JPEG", async () => {
    stubCanvas(() => 400_000)

    const result = await shrinkImageFile(
      makeFile("shot.png", 12_000_000, "image/png")
    )

    expect(result?.name).toBe("shot.jpg")
  })

  it("drops quality and then pixels until it fits", async () => {
    // Only the last rung of the ladder gets under the target.
    const { canvas } = stubCanvas((quality) =>
      quality <= 0.5 ? 800_000 : 2_000_000
    )

    const result = await shrinkImageFile(makeFile("PXL_2.jpg", 20_000_000))

    expect(result?.size).toBe(800_000)
    expect(canvas.width).toBe(1024)
  })

  it("keeps the original when re-encoding would not make it smaller", async () => {
    stubCanvas(() => 3_000_000)

    expect(await shrinkImageFile(makeFile("odd.jpg", 2_000_000))).toBeNull()
  })

  it("keeps the original when the browser cannot decode the format", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("unsupported")
      })
    )

    expect(await shrinkImageFile(makeFile("photo.heic", 8_000_000))).toBeNull()
  })

  it("gives up rather than hanging on a decoder that never answers", async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => new Promise<never>(() => {}))
    )

    const pending = shrinkImageFile(makeFile("stuck.jpg", 8_000_000))
    await vi.advanceTimersByTimeAsync(31_000)

    expect(await pending).toBeNull()
    vi.useRealTimers()
  })
})

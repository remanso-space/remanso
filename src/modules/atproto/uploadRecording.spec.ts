import { beforeEach, describe, expect, it, vi } from "vitest"
import { getActiveSession } from "vue-atproto-login"

import { uploadRecording } from "@/modules/atproto/uploadRecording"

vi.mock("vue-atproto-login", () => ({
  getActiveSession: vi.fn()
}))

const blobRef = {
  $type: "blob",
  ref: { $link: "bafkrei222" },
  mimeType: "audio/mp4",
  size: 1234
}

const makeFile = () =>
  new File([new Uint8Array([1, 2, 3])], "stream.m4a", { type: "audio/mp4" })

const okJson = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response

describe("uploadRecording", () => {
  beforeEach(() => {
    vi.mocked(getActiveSession).mockReset()
  })

  it("uploads the blob then creates the record and returns the at-uri", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3xyz" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({
      fetchHandler
    } as never)

    const uri = await uploadRecording({
      did: "did:plc:abc",
      file: makeFile(),
      title: "Ma 間 - audio",
      durationSec: 3600
    })

    expect(uri).toEqual({
      ok: true,
      uri: "at://did:plc:abc/space.remanso.recording/3xyz"
    })

    const [uploadPath, uploadInit] = fetchHandler.mock.calls[0]
    expect(uploadPath).toBe("/xrpc/com.atproto.repo.uploadBlob")
    expect(uploadInit.method).toBe("POST")
    expect(uploadInit.headers["Content-Type"]).toBe("audio/mp4")

    const [createPath, createInit] = fetchHandler.mock.calls[1]
    expect(createPath).toBe("/xrpc/com.atproto.repo.createRecord")
    const body = JSON.parse(createInit.body)
    expect(body.repo).toBe("did:plc:abc")
    expect(body.collection).toBe("space.remanso.recording")
    expect(body.record.audio).toEqual(blobRef)
    expect(body.record.title).toBe("Ma 間 - audio")
    expect(body.record.durationSec).toBe(3600)
    expect(body.record.createdAt).toEqual(expect.any(String))
  })

  it("uploads with an explicit mimeType when the file carries none", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3xyz" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    const untyped = new File([new Uint8Array([1])], "voice.amr", { type: "" })

    await uploadRecording({
      did: "did:plc:abc",
      file: untyped,
      title: "t",
      mimeType: "audio/amr"
    })

    expect(fetchHandler.mock.calls[0][1].headers["Content-Type"]).toBe(
      "audio/amr"
    )
  })

  it("omits durationSec when it is unknown", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3xyz" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    await uploadRecording({
      did: "did:plc:abc",
      file: makeFile(),
      title: "Ma 間 - audio"
    })

    const body = JSON.parse(fetchHandler.mock.calls[1][1].body)
    expect(body.record).not.toHaveProperty("durationSec")
  })

  it("reports no-session when the OAuth session cannot be restored", async () => {
    vi.mocked(getActiveSession).mockResolvedValue(null)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toEqual({ ok: false, reason: "no-session" })
  })

  // The XRPC error body is the only thing that distinguishes BlobTooLarge from
  // an expired token, so it has to survive back to the caller.
  it("carries the XRPC error body into the failure detail", async () => {
    const fetchHandler = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: "InvalidMimeType",
        message: "Wrong type of file"
      })
    } as unknown as Response)
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toEqual({
      ok: false,
      reason: "upload-failed",
      detail: "400 InvalidMimeType: Wrong type of file"
    })
  })

  it("reports an exception when the request throws", async () => {
    const fetchHandler = vi.fn().mockRejectedValue(new Error("Failed to fetch"))
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toEqual({ ok: false, reason: "exception", detail: "Failed to fetch" })
  })

  it("returns null and skips createRecord when the upload fails", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 413 } as unknown as Response)
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toEqual({ ok: false, reason: "upload-failed", detail: "HTTP 413" })
    expect(fetchHandler).toHaveBeenCalledTimes(1)
  })

  it("reports record-failed when createRecord fails", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce({ ok: false, status: 400 } as unknown as Response)
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "t"
      })
    ).toEqual({ ok: false, reason: "record-failed", detail: "HTTP 400" })
  })

  it("puts the record at the note's rkey when one is given", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3labc" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    expect(
      await uploadRecording({
        did: "did:plc:abc",
        file: makeFile(),
        title: "Ma 間 - audio",
        rkey: "3labc"
      })
    ).toEqual({
      ok: true,
      uri: "at://did:plc:abc/space.remanso.recording/3labc"
    })

    const [writePath, writeInit] = fetchHandler.mock.calls[1]
    expect(writePath).toBe("/xrpc/com.atproto.repo.putRecord")
    const body = JSON.parse(writeInit.body)
    expect(body.rkey).toBe("3labc")
    expect(body.collection).toBe("space.remanso.recording")
    expect(body.record.audio).toEqual(blobRef)
  })

  it("sends no rkey at all when there is none, so the PDS assigns a TID", async () => {
    const fetchHandler = vi
      .fn()
      .mockResolvedValueOnce(okJson({ blob: blobRef }))
      .mockResolvedValueOnce(
        okJson({ uri: "at://did:plc:abc/space.remanso.recording/3xyz" })
      )
    vi.mocked(getActiveSession).mockResolvedValue({ fetchHandler } as never)

    await uploadRecording({
      did: "did:plc:abc",
      file: makeFile(),
      title: "t"
    })

    const [writePath, writeInit] = fetchHandler.mock.calls[1]
    expect(writePath).toBe("/xrpc/com.atproto.repo.createRecord")
    expect(JSON.parse(writeInit.body)).not.toHaveProperty("rkey")
  })
})

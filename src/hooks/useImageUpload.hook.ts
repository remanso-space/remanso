import { Ref, toValue } from "vue"

import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { errorMessage } from "@/utils/notif"
import { shrinkImageFile } from "@/utils/shrinkImageFile"
import { uniqueFilename } from "@/utils/uniqueFilename"

/**
 * Past this we refuse before spending the bandwidth. GitHub's contents API
 * takes the body as base64, a third larger again, and answers late — so an
 * oversized file used to mean a long wait for a failure. Anything a camera
 * produces is shrunk below this first; what is left here is a file we cannot
 * re-encode (an animation, a vector) and genuinely cannot upload.
 */
const MAX_UPLOAD_BYTES = 5_000_000

/**
 * A picked photo is not necessarily on the phone. Android's picker hands back a
 * content URI, and if the picture only lives in Google Photos the bytes are
 * fetched on demand when we read them — over mobile data, for a 20 MP frame.
 * That read can stall indefinitely, which is what an upload that hangs and then
 * fails for no visible reason turns out to be. Bounded so the button always
 * comes back with something to say.
 */
const READ_TIMEOUT_MS = 45_000

/**
 * Reads the picked file into memory once, so the rest of the upload works off
 * bytes we hold rather than re-reading a URI that may be fetching from the
 * cloud. Null means the read stalled, or the picker handed back an entry with
 * nothing behind it.
 */
const readFile = async (file: File): Promise<ArrayBuffer | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const guard = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        "image upload: reading the file gave up after",
        READ_TIMEOUT_MS,
        "ms"
      )
      resolve(null)
    }, READ_TIMEOUT_MS)
  })

  try {
    const buffer = await Promise.race([file.arrayBuffer(), guard])
    if (!buffer?.byteLength) return null
    return buffer
  } catch (error) {
    console.warn("image upload: the file could not be read", error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

const splitPath = (
  fullPath: string
): { directory: string; filename: string } => {
  const lastSlash = fullPath.lastIndexOf("/")
  if (lastSlash === -1) return { directory: "", filename: fullPath }
  return {
    directory: fullPath.slice(0, lastSlash),
    filename: fullPath.slice(lastSlash + 1)
  }
}

const stripMarkdownExtension = (filename: string): string =>
  filename.replace(/\.(md|markdown|mdx)$/i, "")

const extractExtension = (filename: string): string => {
  const dot = filename.lastIndexOf(".")
  if (dot <= 0) return ".png"
  return filename.slice(dot).toLowerCase()
}

export const useImageUpload = ({
  user,
  repo,
  notePath
}: {
  user: string
  repo: string
  notePath: Ref<string | undefined> | string | undefined
}) => {
  const store = useUserRepoStore()
  const { uploadBinaryFile } = useGitHubContent({ user, repo })

  const uploadImage = async (
    file: File
  ): Promise<{ filename: string } | null> => {
    const currentNotePath = toValue(notePath)
    if (!currentNotePath) {
      errorMessage("❌ Image upload failed")
      return null
    }

    try {
      const bytes = await readFile(file)
      if (!bytes) {
        errorMessage("❌ Could not read that image from your phone")
        return null
      }

      // From here everything works off bytes already in memory: the shrink
      // decodes them, and the base64 encode reads them back.
      const source = new File([bytes], file.name, { type: file.type })

      // A phone photo goes up as a fraction of itself; anything the browser
      // will not re-encode is uploaded as it came in.
      const upload = (await shrinkImageFile(source)) ?? source

      if (upload.size > MAX_UPLOAD_BYTES) {
        const megabytes = Math.round(upload.size / 100_000) / 10
        errorMessage(`❌ Image is too large to upload (${megabytes} MB)`)
        return null
      }

      const { directory, filename: noteFilename } = splitPath(currentNotePath)
      const basename = stripMarkdownExtension(noteFilename)
      const extension = extractExtension(upload.name)

      const existingPaths = store.files
        .map((f) => f.path)
        .filter((p): p is string => typeof p === "string")

      const filename = uniqueFilename({
        basename,
        extension,
        existingPaths,
        directory
      })

      const targetPath = directory ? `${directory}/${filename}` : filename

      const buffer = await upload.arrayBuffer()
      const base64 = arrayBufferToBase64(buffer)

      const { sha, conflict } = await uploadBinaryFile({
        base64,
        path: targetPath
      })

      if (conflict || !sha) {
        return null
      }

      store.registerUploadedFile({
        path: targetPath,
        sha,
        type: "blob",
        size: upload.size
      })

      return { filename }
    } catch (error) {
      console.warn("image upload failed", error)
      errorMessage("❌ Image upload failed")
      return null
    }
  }

  return { uploadImage }
}

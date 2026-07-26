import { Ref, toValue } from "vue"

import { useGitHubContent } from "@/hooks/useGitHubContent.hook"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { errorMessage } from "@/utils/notif"
import { uniqueFilename } from "@/utils/uniqueFilename"

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
      const { directory, filename: noteFilename } = splitPath(currentNotePath)
      const basename = stripMarkdownExtension(noteFilename)
      const extension = extractExtension(file.name)

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

      const buffer = await file.arrayBuffer()
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
        size: file.size
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

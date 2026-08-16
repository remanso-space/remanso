import { useFile } from "@/hooks/useFile.hook"
import { tikzPlaceholder } from "@/hooks/useMarkdown.hook"
import { resolvePath } from "@/modules/repo/services/resolvePath"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"

/**
 * Swaps every `![](diagram.tikz)` embed in a note for a TikZ placeholder
 * carrying the referenced file's source, so a diagram can live in its own
 * `.tikz` file and still be drawn inside the note. Call `runTikz` afterwards
 * to render what this leaves behind.
 */
export const runTikzEmbeds = async (
  scopeSelector: string,
  noteSha: string
): Promise<void> => {
  const embeds = Array.from(
    document.querySelectorAll<HTMLImageElement>(
      `${scopeSelector} img[src$=".tikz"]`
    )
  )
  if (embeds.length === 0) return

  const store = useUserRepoStore()
  const notePath = store.files.find((file) => file.sha === noteSha)?.path
  if (!notePath) return

  await Promise.all(
    embeds.map(async (embed) => {
      const embedPath = resolvePath(notePath, embed.getAttribute("src") ?? "")
      const embedFile = store.files.find((file) => file.path === embedPath)
      if (!embedFile?.sha) return

      const { getCachedFileContent } = useFile(embedFile.sha, false)
      const fileContent = await getCachedFileContent()
      if (!fileContent) return

      // The element may have been swapped already by an earlier pass.
      if (!embed.isConnected) return

      const template = document.createElement("template")
      template.innerHTML = tikzPlaceholder(decodeBase64ToUTF8(fileContent))
      const placeholder = template.content.firstElementChild
      if (placeholder) embed.replaceWith(placeholder)
    })
  )
}

import { watch } from "vue"

import { backlinkEventBus } from "@/bus/backlinkEventBus"
import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useFile } from "@/hooks/useFile.hook"
import { Backlink } from "@/modules/note/models/Backlink"
import { BacklinkNote } from "@/modules/note/models/BacklinkNote"
import { resolvePath } from "@/modules/repo/services/resolvePath"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { isExternalLink } from "@/utils/link"
import { filenameToNoteTitle } from "@/utils/noteTitle"
import { confirmMessage } from "@/utils/notif"

const isMarkdown = (filename?: string) => filename?.endsWith(".md") ?? false

const yieldToMain = () =>
  "scheduler" in globalThis
    ? (globalThis as unknown as { scheduler: { yield: () => Promise<void> } }).scheduler.yield()
    : new Promise<void>((r) => setTimeout(r, 0))

export const useComputeBacklinks = () => {
  const store = useUserRepoStore()

  watch(
    () => store.files,
    async () => {
      await new Promise<void>((r) => setTimeout(r, 300))

      if (!store.userSettings?.backlink) {
        return
      }

      let notifiedForComputation = false

      const backlinks: Map<string, Backlink[]> = new Map()

      for (const file of store.files) {
        await yieldToMain()

        if (!isMarkdown(file.path) || !file.sha) {
          continue
        }

        const fileBacklinkId = data.generateId(DataType.BacklinkNote, file.sha)
        const fileBacklink = await data.get<DataType.BacklinkNote, BacklinkNote>(
          fileBacklinkId
        )
        if (fileBacklink) {
          continue
        }

        if (!backlinks.has(file.sha)) {
          backlinks.set(file.sha, [])
        }

        const { getContent } = useFile(file.sha, false)
        const note = await getContent()

        if (!note) {
          return
        }

        const parser = new DOMParser()
        const htmlDoc = parser.parseFromString(note, "text/html")

        const links = htmlDoc.querySelectorAll("a")

        for (const link of links) {
          const href = link.getAttribute("href") ?? ""

          if (isExternalLink(href) || !isMarkdown(href)) {
            continue
          }

          const path = resolvePath(file.path ?? "", href)
          const backlinkFile = store.files.find((file) => file.path === path)

          if (!backlinkFile?.sha || !backlinkFile?.path) {
            continue
          }

          const previousBacklinks = backlinks.get(backlinkFile.sha) ?? []

          if (previousBacklinks.find((bl) => bl.sha === file.sha)) {
            continue
          }

          if (!notifiedForComputation) {
            notifiedForComputation = true
            confirmMessage("Updating backlinks...")
          }

          backlinks.set(backlinkFile.sha, [
            ...previousBacklinks,
            {
              sha: file.sha,
              title: filenameToNoteTitle(file.path ?? "")
            }
          ])
        }
      }

      for (const [sha, fileBacklinks] of backlinks) {
        const fileBacklinkId = data.generateId(DataType.BacklinkNote, sha)
        const backlinkNote: BacklinkNote = {
          _id: fileBacklinkId,
          $type: DataType.BacklinkNote,
          sha: sha,
          links: fileBacklinks
        }

        await data.update(backlinkNote)
        backlinkEventBus.emit({ fileSha: sha })
      }
    }
  )
}

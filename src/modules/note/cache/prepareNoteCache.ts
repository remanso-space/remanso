import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { Note } from "@/modules/note/models/Note"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

type NoteCacheResult =
  | {
      note: Note
      from: "sha"
    }
  | { note: Note; from: "path" }
  | { note: null; from: null }

export const prepareNoteCache = (sha: string, path?: string) => {
  const store = useUserRepoStore()

  const noteId = generateId(DataType.Note, sha)
  const notePath = path ? generateId(DataType.Note, path) : null
  const getCachedNote = async (): Promise<NoteCacheResult> => {
    const note = await data.get<DataType.Note, Note>(noteId)

    if (note) {
      return { note, from: "sha" }
    }

    if (notePath) {
      const note = await data.get<DataType.Note, Note>(notePath)
      if (!note) {
        return {
          note: null,
          from: null
        }
      }
      return {
        note,
        from: "path"
      }
    }

    return { note: null, from: null }
  }

  const saveCacheNote = async (
    content: string,
    params?: { editedSha?: string; path?: string }
  ) => {
    const newNote: Note = {
      _id: noteId,
      $type: DataType.Note,
      content,
      editedSha: params?.editedSha
    }

    if (params && params.path) {
      store.addFile({
        path: params.path,
        sha: params.editedSha
      })
    }

    await data.update(newNote)

    if (notePath) {
      await data.update({
        ...newNote,
        _id: notePath
      })
    }
  }

  return {
    getCachedNote,
    saveCacheNote
  }
}

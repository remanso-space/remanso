export const filenameToNoteTitle = (title: string) =>
  title.replaceAll("/", " / ").replaceAll("-", " ")

export const pathToNotePathTitle = (path: string) => {
  const fileNames = path.split(".")

  fileNames.pop()
  return fileNames
    .join(".")
    .split("/")
    .filter((path) => !path.includes("README"))
    .join("/")
    .replaceAll("-", " ")
}

export const pathToNoteTitle = (notePathTitle: string) => {
  return pathToNotePathTitle(notePathTitle).split("/").pop()?.trim() ?? ""
}

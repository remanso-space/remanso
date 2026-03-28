const sanitizePath = (path: string) => {
  if (path.startsWith("./")) {
    return decodeURIComponent(path.replace("./", ""))
  }
  return decodeURIComponent(path)
}

const removeNoteFilename = (pathNote: string) => {
  const path = pathNote.split("/")
  path.pop()

  return sanitizePath(path.join("/"))
}

export const resolvePath = (
  currentAbsolutePathNote: string,
  pathToResolve: string
) => {
  let currentAbsolutePath = removeNoteFilename(currentAbsolutePathNote)
  pathToResolve = sanitizePath(pathToResolve)

  while (pathToResolve.startsWith("../")) {
    const adjustedAbsolutePath = currentAbsolutePath.split("/")
    adjustedAbsolutePath.pop()
    currentAbsolutePath = adjustedAbsolutePath.join("/")
    pathToResolve = pathToResolve.replace("../", "")
  }

  return currentAbsolutePath
    ? `${currentAbsolutePath}/${pathToResolve}`
    : pathToResolve
}

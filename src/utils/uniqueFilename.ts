export const uniqueFilename = ({
  basename,
  extension,
  existingPaths,
  directory
}: {
  basename: string
  extension: string
  existingPaths: string[]
  directory: string
}): string => {
  const prefix = directory ? `${directory}/` : ""
  const candidate = (n: number) =>
    n === 1 ? `${basename}${extension}` : `${basename}-${n}${extension}`
  const taken = new Set(existingPaths)
  let n = 1
  while (taken.has(`${prefix}${candidate(n)}`)) {
    n = n === 1 ? 2 : n + 1
  }
  return candidate(n)
}

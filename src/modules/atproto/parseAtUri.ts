export const parseAtUri = (
  atUri: string
): { did: string; collection: string; rkey: string } => {
  const match = atUri.match(/^at:\/\/(did:[^/]+)\/([^/]+)\/(.+)$/)
  if (!match) {
    throw new Error(`Invalid AT URI: ${atUri}`)
  }
  return { did: match[1], collection: match[2], rkey: match[3] }
}

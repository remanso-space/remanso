export const withATProtoImages = (
  markdown: string,
  { pds, did }: { pds: string; did: string }
): string => {
  const imageLinkPattern = /!\[([^\]]*)\]\((bafkrei[a-z0-9]+)\)/g

  return markdown.replace(imageLinkPattern, (_, altText, cid) => {
    const imageUrl = new URL("/xrpc/com.atproto.sync.getBlob", pds)
    imageUrl.searchParams.set("did", did)
    imageUrl.searchParams.set("cid", cid)
    return `![${altText}](${imageUrl.toString()})`
  })
}

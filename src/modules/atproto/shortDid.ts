export const toShortDid = (did: string) => did.replace(/^did:(plc:)?/, "")
// did:plc:xxx → xxx, did:web:x → web:x

export const fromShortDid = (shortDid: string) => {
  if (shortDid.startsWith("did:")) return shortDid
  return shortDid.includes(":") ? `did:${shortDid}` : `did:plc:${shortDid}`
}
// xxx → did:plc:xxx, web:x → did:web:x, did:plc:xxx → did:plc:xxx (passthrough)

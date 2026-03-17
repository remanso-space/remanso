export const toShortDid = (did: string) => did.replace(/^did:(plc:)?/, "")
// did:plc:xxx → xxx, did:web:x → web:x

export const fromShortDid = (shortDid: string) =>
  shortDid.includes(":") ? `did:${shortDid}` : `did:plc:${shortDid}`
// xxx → did:plc:xxx, web:x → did:web:x

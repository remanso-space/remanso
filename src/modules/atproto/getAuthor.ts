import { createFetch, createSchema } from "@better-fetch/fetch"
import { type } from "arktype"

export type Author = { handle: string; pds: string }

const correspondanceCache = new Map<string, Author>()

const schema = createSchema(
  {
    "/xrpc/blue.microcosm.identity.resolveMiniDoc": {
      output: type({
        did: "string",
        handle: "string",
        pds: "string",
        signing_key: "string"
      }),
      query: type({
        identifier: "string"
      })
    }
  },
  { strict: true }
)

const microcosmSlingshot = createFetch({
  baseURL: "https://slingshot.microcosm.blue",
  // plugins: [logger()],
  schema
})

export const getAuthor = async (did: string): Promise<Author | null> => {
  if (correspondanceCache.has(did)) {
    return correspondanceCache.get(did) as Author
  }

  try {
    const { data: author } = await microcosmSlingshot(
      "/xrpc/blue.microcosm.identity.resolveMiniDoc",
      { query: { identifier: did } }
    )

    if (!author) {
      return null
    }

    correspondanceCache.set(did, author)

    return author
  } catch (e) {
    console.warn(e)

    return null
  }
}

export const getAuthors = async (dids: Set<string>) => {
  const correspondance = await Promise.all(
    [...dids].map(async (did) => {
      if (correspondanceCache.has(did)) {
        return [did, correspondanceCache.get(did)] as [string, Author | null]
      }

      const { data: author } = await microcosmSlingshot(
        "/xrpc/blue.microcosm.identity.resolveMiniDoc",
        { query: { identifier: did } }
      )

      if (!author) {
        return [did, null] as [string, Author | null]
      }

      correspondanceCache.set(did, author)

      return [did, author] as [string, Author | null]
    })
  )

  return new Map(correspondance)
}

export const getFollows = async (did: string): Promise<Set<string>> => {
  const follows = new Set<string>()
  let cursor: string | undefined

  do {
    const url = new URL(
      "https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows"
    )
    url.searchParams.set("actor", did)
    url.searchParams.set("limit", "100")
    if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const response = await fetch(url)
    const result: { follows: { did: string }[]; cursor?: string } =
      await response.json()

    for (const follow of result.follows) {
      follows.add(follow.did)
    }

    cursor = result.cursor
  } while (cursor)

  return follows
}

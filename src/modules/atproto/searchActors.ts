// The handle picker in the atproto sign-in box. Typing your own handle from memory is fine,
// but there is no way to discover the exact spelling of one you half-remember, so the box
// searches the network: the public Bluesky appview indexes every atproto handle and answers
// typeahead unauthenticated, which keeps the box usable before you have signed in.

const PUBLIC_API = "https://public.api.bsky.app"

/** One suggestion. `handle` is what sign-in uses; the rest is only for display. */
export interface ActorSuggestion {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

/** A `ProfileViewBasic`, narrowed to the fields a suggestion row shows. */
interface ProfileViewBasic {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

/**
 * Handles matching a typed prefix, best match first. Never throws and never rejects: a
 * suggestion list is a convenience, and a network hiccup should leave the box behaving like
 * a plain text field rather than showing an error.
 */
export const searchActors = async (
  query: string,
  { limit = 8, signal }: { limit?: number; signal?: AbortSignal } = {}
): Promise<ActorSuggestion[]> => {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({ q, limit: String(limit) })

  try {
    const res = await fetch(
      `${PUBLIC_API}/xrpc/app.bsky.actor.searchActorsTypeahead?${params}`,
      { signal }
    )
    if (!res.ok) return []

    const body = (await res.json()) as { actors?: ProfileViewBasic[] }
    return (body.actors ?? []).map(({ did, handle, displayName, avatar }) => ({
      did,
      handle,
      displayName,
      avatar
    }))
  } catch {
    // Includes the abort of a superseded keystroke, which is not a failure worth surfacing.
    return []
  }
}

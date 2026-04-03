import {
  BrowserOAuthClient,
  buildLoopbackClientId
} from "@atproto/oauth-client-browser"

const getClientId = () =>
  import.meta.env.DEV
    ? buildLoopbackClientId(new URL(window.location.origin))
    : "https://remanso.space/client-metadata.json"

let clientPromise: Promise<BrowserOAuthClient> | null = null

export const getOAuthClient = (): Promise<BrowserOAuthClient> => {
  if (!clientPromise) {
    clientPromise = BrowserOAuthClient.load({
      clientId: getClientId(),
      handleResolver: "https://bsky.social"
    })
  }
  return clientPromise
}

export const signInWithHandle = async (handle: string): Promise<void> => {
  const client = await getOAuthClient()
  await client.signInRedirect(handle)
}

export const restoreSession = async () => {
  const client = await getOAuthClient()
  const result = await client.init()
  return result?.session ?? null
}

export const sdkSignOut = async (sub: string): Promise<void> => {
  const client = await getOAuthClient()
  await client.revoke(sub)
}

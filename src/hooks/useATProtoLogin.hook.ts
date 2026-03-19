import { computed, ref } from 'vue'

import { getAuthor } from '@/modules/atproto/getAuthor'
import { restoreSession, sdkSignOut, signInWithHandle } from '@/modules/atproto/service/atprotoOAuth'
import { clearSession, loadSession, saveSession } from '@/modules/atproto/service/atprotoSession'

const did = ref<string | null>(null)
const handle = ref<string | null>(null)

let init = true

const initializeAuth = async () => {
  // Load cached session from IndexedDB first (fast, local) so the UI can render immediately
  const stored = await loadSession()
  did.value = stored?.did ?? ''
  handle.value = stored?.handle ?? ''

  // Then restore OAuth session in the background (may involve network)
  const session = await restoreSession()
  if (session) {
    const author = await getAuthor(session.did)
    const resolvedHandle = author?.handle ?? ''

    did.value = session.did
    handle.value = resolvedHandle
    await saveSession(session.did, resolvedHandle)

    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

export const useATProtoLogin = () => {
  if (init) {
    init = false
    initializeAuth()
  }

  const isLoggedIn = computed(() => !!did.value)
  const isATProtoReady = computed(() => did.value !== null)

  const signIn = async (inputHandle: string): Promise<void> => {
    await signInWithHandle(inputHandle)
  }

  const signOut = async (): Promise<void> => {
    if (did.value) {
      await sdkSignOut(did.value)
    }
    await clearSession()
    did.value = ''
    handle.value = ''
  }

  return {
    did,
    handle,
    isLoggedIn,
    isATProtoReady,
    signIn,
    signOut,
  }
}

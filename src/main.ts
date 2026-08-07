import "notyf/notyf.min.css"
import "./styles/app.css"
import "@/analytics/openpanel"

import { createPinia } from "pinia"
import { createApp } from "vue"
import {
  atprotoLoginPlugin,
  bskyProfileResolver,
  combineResolvers,
  slingshotProfileResolver
} from "vue-atproto-login"
import { createI18n } from "vue-i18n"

import { messages } from "@/locales/message"
import {
  clearSession,
  loadSession,
  saveSession
} from "@/modules/atproto/service/atprotoSession"
import { router } from "@/router/router"

import App from "./App.vue"

const i18n = createI18n({
  locale: "en",
  messages
})

createApp(App)
  .use(router)
  .use(i18n)
  .use(createPinia())
  .use(
    atprotoLoginPlugin({
      clientId: "https://remanso.space/client-metadata.json",
      dev: import.meta.env.DEV,
      // The identity hint stays in PouchDB, so a reload paints a handle before
      // any network call. The grant itself lives in the SDK's IndexedDB.
      storage: {
        load: () => loadSession(),
        save: ({ did, handle }) => saveSession(did, handle),
        // PouchDB answers with "did it remove anything", which the storage
        // contract has no use for.
        clear: async () => {
          await clearSession()
        }
      },
      // Slingshot answers handle and PDS, the appview answers the avatar —
      // which is the pair the app used before, one call each.
      resolveProfile: combineResolvers(
        slingshotProfileResolver(),
        bskyProfileResolver()
      )
    })
  )
  .mount("#app")

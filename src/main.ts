import "notyf/notyf.min.css"
import "./styles/app.css"
import "@/analytics/openpanel"

import { VueQueryPlugin } from "@tanstack/vue-query"
import { createPinia } from "pinia"
import { createApp } from "vue"
import { createI18n } from "vue-i18n"

import { messages } from "@/locales/message"
import { router } from "@/router/router"

import App from "./App.vue"

const i18n = createI18n({
  locale: "en",
  messages
})

createApp(App)
  .use(router)
  .use(VueQueryPlugin)
  .use(i18n)
  .use(createPinia())
  .mount("#app")

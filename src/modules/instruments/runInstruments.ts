import { type App, createApp } from "vue"

import { instrumentLoaders, type InstrumentName } from "./registry"

const mounted: { app: App; el: HTMLElement }[] = []

/**
 * Unmount instrument apps whose placeholder left the DOM (a note re-render
 * replaces the whole subtree) so their intervals and audio stop.
 */
const unmountDisconnected = (): void => {
  for (let index = mounted.length - 1; index >= 0; index--) {
    if (mounted[index].el.isConnected) continue
    mounted[index].app.unmount()
    mounted.splice(index, 1)
  }
}

/**
 * Mount an instrument component onto every :::name::: placeholder in scope.
 * Components only load when a placeholder actually exists, so notes without
 * instruments pay nothing.
 *
 * Every instrument gets the next sibling element as-is; reading it (or
 * ignoring it) is the instrument's own job — see ./sibling.
 */
export const runInstruments = async (querySelector: string): Promise<void> => {
  unmountDisconnected()

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(querySelector)
  ).filter((el) => !el.dataset.instrumentMounted)
  if (elements.length === 0) return

  await Promise.all(
    elements.map(async (el) => {
      const name = el.dataset.instrument as InstrumentName
      const loader = instrumentLoaders[name]
      if (!loader) return
      el.dataset.instrumentMounted = "true"
      const args = el.dataset.args ?? ""
      const sibling =
        el.nextElementSibling instanceof HTMLElement
          ? el.nextElementSibling
          : undefined
      const component = await loader()
      const app = createApp(component, { args, name, sibling })
      app.mount(el)
      mounted.push({ app, el })
    })
  )
}

import { createEventBus } from "retrobus"

interface EventBusParams {
  user: string
  repo: string
  path: string
  hash?: string
  currentNoteSHA?: string
}

export const noteEventBus = createEventBus<EventBusParams>()

import { createEventBus } from "retrobus"

interface EventBusParams {
  user: string
  repo: string
  path: string
  currentNoteSHA?: string
}

export const noteEventBus = createEventBus<EventBusParams>()

import { createEventBus } from "retrobus"

interface EventBusParams {
  fileSha: string
}

export const backlinkEventBus = createEventBus<EventBusParams>()

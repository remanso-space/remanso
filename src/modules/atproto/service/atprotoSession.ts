import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { AtprotoSession } from "@/data/models/AtprotoSession"

const SESSION_ID = `${DataType.AtprotoSession}-current`

export const loadSession = (): Promise<AtprotoSession | null> => {
  return data.get<DataType.AtprotoSession, AtprotoSession>(SESSION_ID)
}

export const saveSession = async (
  did: string,
  handle: string
): Promise<void> => {
  const session: AtprotoSession = {
    _id: SESSION_ID,
    $type: DataType.AtprotoSession,
    did,
    handle
  }
  await data.update<DataType.AtprotoSession, AtprotoSession>(session)
}

export const clearSession = (): Promise<boolean> => {
  return data.remove(SESSION_ID)
}

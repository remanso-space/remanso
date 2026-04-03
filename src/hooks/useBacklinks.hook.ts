import { useAsyncState } from "@vueuse/core"
import { ComputedRef, onUnmounted, toValue } from "vue"

import { backlinkEventBus } from "@/bus/backlinkEventBus"
import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { BacklinkNote } from "@/modules/note/models/BacklinkNote"

export const useBacklinks = (sha: string | ComputedRef<string>) => {
  sha = toValue(sha)

  const { state: backlink, execute } = useAsyncState(
    data.get<DataType.BacklinkNote, BacklinkNote>(
      data.generateId(DataType.BacklinkNote, sha)
    ),
    null,
    {
      resetOnExecute: true
    }
  )

  const unsubscribe = backlinkEventBus.addEventBusListener(
    ({ fileSha }) => {
      if (fileSha !== sha) {
        return
      }
      execute()
    },
    {
      retro: true
    }
  )

  onUnmounted(() => unsubscribe())

  return {
    backlink
  }
}

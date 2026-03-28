import { useAsyncState } from "@vueuse/core"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { RepetitionCard } from "@/modules/card/models/RepetitionCard"

export const useNeedReviewCards = () => {
  const { state: cardsToReview, isReady } = useAsyncState(async () => {
    const repetitions = await data.getAll<
      DataType.RepetitionCard,
      RepetitionCard
    >({
      prefix: DataType.RepetitionCard
    })

    return repetitions.filter((repetition) => repetition.needsReview)
  }, [])

  return {
    cardsToReview,
    isReady
  }
}

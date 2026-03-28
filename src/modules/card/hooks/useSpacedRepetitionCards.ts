// https://npm.io/package/supermemo

import { useAsyncState } from "@vueuse/core"
import { addDays, isAfter } from "date-fns"
import { computed, nextTick, watch } from "vue"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useFile } from "@/hooks/useFile.hook"
import { useLinks } from "@/hooks/useLinks.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { Card } from "@/modules/card/models/Card"
import { RepetitionCard } from "@/modules/card/models/RepetitionCard"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"
import { decodeBase64ToUTF8 } from "@/utils/decodeBase64ToUTF8"

const MAX_LEVEL = 8

export interface Repetition {
  repetition: RepetitionCard
  card: Card
}

export const useSpacedRepetitionCards = () => {
  const { toHTML } = markdownBuilder()
  const store = useUserRepoStore()
  const { listenToClick } = useLinks("flip-card")

  const cardFiles = computed(() =>
    store.files.filter(
      (file) =>
        file.path !== undefined &&
        file.path.startsWith("_cards") &&
        file.path.endsWith(".md")
    )
  )

  const {
    state: cards,
    isReady,
    execute
  } = useAsyncState(
    async () => {
      const cards: Repetition[] = []

      for (const cardFile of cardFiles.value) {
        if (!cardFile.sha) {
          continue
        }

        const repetition = await data.getOrCreate<
          DataType.RepetitionCard,
          RepetitionCard
        >(data.generateId(DataType.RepetitionCard, cardFile.path), {
          $type: DataType.RepetitionCard,
          level: 1,
          repeatDate: new Date(),
          needsReview: false
        })

        if (
          isAfter(new Date(repetition.repeatDate), new Date()) ||
          repetition.level === MAX_LEVEL ||
          repetition.needsReview
        ) {
          continue
        }

        const { getContent } = useFile(cardFile.sha, false)
        const content = (await getContent()) ?? ""

        const [front, back, references] =
          decodeBase64ToUTF8(content).split("___") ?? []

        cards.push({
          repetition,
          card: {
            front: toHTML(front),
            back: toHTML(back),
            references: toHTML(references)
          }
        })
      }

      return cards
    },
    [],
    { immediate: false }
  )

  const successRepetition = async (cardId: string) => {
    const repetition = await data.get<DataType.RepetitionCard, RepetitionCard>(
      cardId
    )
    if (!repetition) {
      return
    }

    await data.update<DataType.RepetitionCard, RepetitionCard>({
      ...repetition,
      needsReview: false,
      level: Math.min(repetition.level + 1, MAX_LEVEL),
      repeatDate: addDays(new Date(), 2 ** repetition.level)
    })
  }

  const failRepetition = async (cardId: string) => {
    const repetition = await data.get<DataType.RepetitionCard, RepetitionCard>(
      cardId
    )
    if (!repetition) {
      return
    }

    const level = 1

    await data.update<DataType.RepetitionCard, RepetitionCard>({
      ...repetition,
      level,
      needsReview: false,
      repeatDate: addDays(new Date(), level)
    })
  }

  const needsReview = async (cardId: string) => {
    const repetition = await data.get<DataType.RepetitionCard, RepetitionCard>(
      cardId
    )
    if (!repetition) {
      return
    }

    await data.update<DataType.RepetitionCard, RepetitionCard>({
      ...repetition,
      needsReview: true
    })
  }

  watch(
    cards,
    () =>
      nextTick(() => {
        listenToClick()
      }),
    { immediate: true }
  )

  watch(cardFiles, () => execute())

  return {
    cards,
    successRepetition,
    failRepetition,
    needsReview,
    isLoading: !isReady
  }
}

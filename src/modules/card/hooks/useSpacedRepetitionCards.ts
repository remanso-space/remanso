// https://npm.io/package/supermemo

import { useAsyncState } from "@vueuse/core"
import { addDays, isAfter } from "date-fns"
import { computed, nextTick, ref, watch } from "vue"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { useFile } from "@/hooks/useFile.hook"
import { useLinks } from "@/hooks/useLinks.hook"
import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { useRepetitionSync } from "@/modules/card/hooks/useRepetitionSync"
import { Card } from "@/modules/card/models/Card"
import { RepetitionCard } from "@/modules/card/models/RepetitionCard"
import { parseCardContent } from "@/modules/card/services/parseCardContent"
import { cardIdFromPath } from "@/modules/card/services/repetitionSync"
import { useUserRepoStore } from "@/modules/repo/store/userRepo.store"

const MAX_LEVEL = 8

/** Cards are markdown files under `_cards/`. */
const CARDS_DIR = "_cards/"

export interface Repetition {
  repetition: RepetitionCard
  card: Card
}

export const useSpacedRepetitionCards = () => {
  const { toHTML } = markdownBuilder()
  const store = useUserRepoStore()
  const { listenToClick } = useLinks("flip-card")
  const { sync, pushSoon } = useRepetitionSync()

  const cardFiles = computed(() =>
    store.files.filter(
      (file) =>
        file.path !== undefined &&
        file.path.startsWith(CARDS_DIR) &&
        file.path.endsWith(".md")
    )
  )

  const hasLoadedOnce = ref(false)

  const {
    state: cards,
    isLoading: isFetching,
    execute
  } = useAsyncState(
    async () => {
      // Pull the repo's review state first: a card answered on another device
      // must not come back up here.
      await sync()

      const cards: Repetition[] = []

      for (const cardFile of cardFiles.value) {
        if (!cardFile.sha || !cardFile.path) {
          continue
        }

        const repetition = await data.getOrCreate<
          DataType.RepetitionCard,
          RepetitionCard
        >(cardIdFromPath(cardFile.path), {
          $type: DataType.RepetitionCard,
          level: 1,
          repeatDate: new Date(0).toISOString(),
          needsReview: false,
          updatedAt: new Date(0).toISOString()
        })

        if (
          isAfter(new Date(repetition.repeatDate), new Date()) ||
          repetition.level === MAX_LEVEL ||
          repetition.needsReview
        ) {
          continue
        }

        const { getRawContent } = useFile(cardFile.sha, false)
        const raw = (await getRawContent()) ?? ""

        const { front, back, references } = parseCardContent(raw)

        cards.push({
          repetition,
          card: {
            front: toHTML(front),
            back: toHTML(back),
            references: toHTML(references)
          }
        })
      }

      hasLoadedOnce.value = true

      return cards
    },
    [],
    { immediate: false, onError: () => (hasLoadedOnce.value = true) }
  )

  const isLoading = computed(() => isFetching.value || !hasLoadedOnce.value)

  const answer = async (
    cardId: string,
    change: (repetition: RepetitionCard) => Partial<RepetitionCard>
  ) => {
    const repetition = await data.get<DataType.RepetitionCard, RepetitionCard>(
      cardId
    )
    if (!repetition) {
      return
    }

    await data.update<DataType.RepetitionCard, RepetitionCard>({
      ...repetition,
      ...change(repetition),
      updatedAt: new Date().toISOString()
    })

    pushSoon()
  }

  const successRepetition = (cardId: string) =>
    answer(cardId, (repetition) => ({
      needsReview: false,
      level: Math.min(repetition.level + 1, MAX_LEVEL),
      repeatDate: addDays(new Date(), 2 ** repetition.level).toISOString()
    }))

  const failRepetition = (cardId: string) =>
    answer(cardId, () => ({
      level: 1,
      needsReview: false,
      repeatDate: addDays(new Date(), 1).toISOString()
    }))

  const needsReview = (cardId: string) =>
    answer(cardId, () => ({ needsReview: true }))

  watch(
    cards,
    () =>
      nextTick(() => {
        listenToClick()
      }),
    { immediate: true }
  )

  watch(cardFiles, () => execute(), { immediate: true })

  return {
    cards,
    cardFileCount: computed(() => cardFiles.value.length),
    successRepetition,
    failRepetition,
    needsReview,
    isLoading
  }
}

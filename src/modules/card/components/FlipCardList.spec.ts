import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import { DataType } from "@/data/DataType.enum"
import FlipCardList from "@/modules/card/components/FlipCardList.vue"
import { Repetition } from "@/modules/card/hooks/useSpacedRepetitionCards"

const repetition = (path: string, level: number): Repetition => ({
  repetition: {
    _id: `RepetitionCard-${path}`,
    $type: DataType.RepetitionCard,
    level,
    repeatDate: "1970-01-01T00:00:00.000Z",
    needsReview: false
  },
  card: {
    front: `<p>front ${path}</p>`,
    back: `<p>back ${path}</p>`,
    references: ""
  }
})

const mountList = (cards: Repetition[]) =>
  mount(FlipCardList, { props: { cards } })

const answer = (wrapper: ReturnType<typeof mountList>, label: string) =>
  wrapper
    .findAll("button")
    .find((button) => button.text().includes(label))!
    .trigger("click")

describe("FlipCardList", () => {
  it("shows the highest level first and counts what is left", () => {
    const wrapper = mountList([
      repetition("_cards/a.md", 1),
      repetition("_cards/b.md", 4)
    ])

    expect(wrapper.text()).toContain("Level 4")
    expect(wrapper.text()).toContain("2 left")
    expect(wrapper.html()).toContain("front _cards/b.md")
  })

  it("moves to the next card on a success", async () => {
    const wrapper = mountList([
      repetition("_cards/a.md", 1),
      repetition("_cards/b.md", 4)
    ])

    await answer(wrapper, "got it")

    expect(wrapper.emitted("success")?.[0]).toEqual([
      "RepetitionCard-_cards/b.md"
    ])
    expect(wrapper.text()).toContain("1 left")
    expect(wrapper.html()).toContain("front _cards/a.md")
  })

  it("puts a failed card back at the end of the session", async () => {
    const wrapper = mountList([repetition("_cards/a.md", 1)])

    await answer(wrapper, "failed")

    expect(wrapper.emitted("fail")?.[0]).toEqual(["RepetitionCard-_cards/a.md"])
    expect(wrapper.html()).toContain("front _cards/a.md")
    expect(wrapper.text()).toContain("1 left")
  })

  it("drops a card marked as needing review without requeueing it", async () => {
    const wrapper = mountList([repetition("_cards/a.md", 1)])

    await answer(wrapper, "needs review")

    expect(wrapper.emitted("needsReview")?.[0]).toEqual([
      "RepetitionCard-_cards/a.md"
    ])
    expect(wrapper.text()).toContain("No more cards to check!")
  })

  it("ends the session without crashing once every card is answered", async () => {
    const wrapper = mountList([repetition("_cards/a.md", 1)])

    await answer(wrapper, "got it")

    expect(wrapper.text()).toContain("No more cards to check!")
    expect(wrapper.findAll("button")).toHaveLength(0)
  })

  it("restarts on a new batch of cards", async () => {
    const wrapper = mountList([repetition("_cards/a.md", 1)])
    await answer(wrapper, "got it")

    await wrapper.setProps({ cards: [repetition("_cards/c.md", 2)] })

    expect(wrapper.html()).toContain("front _cards/c.md")
    expect(wrapper.text()).toContain("1 left")
  })
})

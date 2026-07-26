import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"

import FlashcardsInstrument from "@/modules/instruments/components/FlashcardsInstrument.vue"
import type { InstrumentTable } from "@/modules/instruments/runInstruments"

vi.mock("@/modules/instruments/shuffle", () => ({
  shuffle: <T>(items: T[]): T[] => [...items]
}))

const twoColumnTable: InstrumentTable = {
  header: ["Question", "Réponse"],
  rows: [
    ["Comment dire « bleu » ?", "파란색"],
    ["Full sentences work fine", "Yes, any cell text"]
  ]
}

const mountFlashcards = (props: { args?: string; table?: InstrumentTable }) =>
  mount(FlashcardsInstrument, {
    props: { args: props.args ?? "", name: "flashcards", table: props.table }
  })

type Wrapper = ReturnType<typeof mountFlashcards>

const question = (wrapper: Wrapper) => wrapper.get(".flashcard-question").text()

const progress = (wrapper: Wrapper) => wrapper.get(".flashcard-progress").text()

const clickButton = async (wrapper: Wrapper, label: string) => {
  const button = wrapper
    .findAll("button")
    .find((candidate) => candidate.text() === label)
  expect(button, `button "${label}"`).toBeDefined()
  await button?.trigger("click")
}

describe("FlashcardsInstrument", () => {
  it("builds the deck from table rows and shows the first question", () => {
    const wrapper = mountFlashcards({ table: twoColumnTable })
    expect(question(wrapper)).toBe("Comment dire « bleu » ?")
    expect(wrapper.find(".flashcard-answer").exists()).toBe(false)
    expect(progress(wrapper)).toBe("1 / 2")
  })

  it("reveals the answer below the question", async () => {
    const wrapper = mountFlashcards({ table: twoColumnTable })
    await clickButton(wrapper, "Reveal")
    expect(question(wrapper)).toBe("Comment dire « bleu » ?")
    expect(wrapper.get(".flashcard-answer").text()).toBe("파란색")
  })

  it("advances to the next card and updates progress", async () => {
    const wrapper = mountFlashcards({ table: twoColumnTable })
    await clickButton(wrapper, "Reveal")
    await clickButton(wrapper, "Next")
    expect(question(wrapper)).toBe("Full sentences work fine")
    expect(wrapper.find(".flashcard-answer").exists()).toBe(false)
    expect(progress(wrapper)).toBe("2 / 2")
  })

  it("inverts question and answer when args contain swap", async () => {
    const wrapper = mountFlashcards({ args: "swap", table: twoColumnTable })
    expect(question(wrapper)).toBe("파란색")
    expect(wrapper.get(".flashcard-hint").text()).toBe("Réponse → Question")
    await clickButton(wrapper, "Reveal")
    expect(wrapper.get(".flashcard-answer").text()).toBe(
      "Comment dire « bleu » ?"
    )
  })

  it("joins the remaining cells when the table has 3+ columns", async () => {
    const wrapper = mountFlashcards({
      table: {
        header: ["Mot", "Hangul", "Romanisation"],
        rows: [["bleu", "파란색", "paransaek"]]
      }
    })
    expect(question(wrapper)).toBe("bleu")
    expect(wrapper.get(".flashcard-hint").text()).toBe(
      "Mot → Hangul — Romanisation"
    )
    await clickButton(wrapper, "Reveal")
    expect(wrapper.get(".flashcard-answer").text()).toBe("파란색 — paransaek")
  })

  it("shows a hint when there is no table", () => {
    const wrapper = mountFlashcards({})
    expect(wrapper.text()).toContain(
      "Add a markdown table right below :::flashcards:::"
    )
    expect(wrapper.find("button").exists()).toBe(false)
  })

  it("shows a hint when the table has zero rows", () => {
    const wrapper = mountFlashcards({
      table: { header: ["Question", "Réponse"], rows: [] }
    })
    expect(wrapper.text()).toContain(
      "Add a markdown table right below :::flashcards:::"
    )
  })

  it("flashcard (singular) shows one card without deck mechanics", async () => {
    const wrapper = mount(FlashcardsInstrument, {
      props: { args: "", name: "flashcard", table: twoColumnTable }
    })
    expect(question(wrapper)).toBe("Comment dire « bleu » ?")
    expect(wrapper.find(".flashcard-progress").exists()).toBe(false)
    expect(wrapper.find(".flashcard-hint").exists()).toBe(false)
    await clickButton(wrapper, "Reveal")
    expect(wrapper.get(".flashcard-answer").text()).toBe("파란색")
    expect(
      wrapper.findAll("button").some((button) => button.text() === "Next")
    ).toBe(false)
    await clickButton(wrapper, "Hide")
    expect(wrapper.find(".flashcard-answer").exists()).toBe(false)
    expect(question(wrapper)).toBe("Comment dire « bleu » ?")
  })

  it("flashcard hint names the singular instrument", () => {
    const wrapper = mount(FlashcardsInstrument, {
      props: { args: "", name: "flashcard" }
    })
    expect(wrapper.text()).toContain(
      "Add a markdown table right below :::flashcard:::"
    )
  })

  it("restarts after the done state and resets progress", async () => {
    const wrapper = mountFlashcards({ table: twoColumnTable })
    await clickButton(wrapper, "Reveal")
    await clickButton(wrapper, "Next")
    await clickButton(wrapper, "Reveal")
    await clickButton(wrapper, "Next")
    expect(wrapper.get(".flashcard-done").text()).toBe("Done")
    expect(wrapper.find(".flashcard-question").exists()).toBe(false)
    await clickButton(wrapper, "Restart")
    expect(question(wrapper)).toBe("Comment dire « bleu » ?")
    expect(progress(wrapper)).toBe("1 / 2")
  })
})

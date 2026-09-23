/** A card file is `front ___ back ___ references`, the rest is optional. */
const CARD_SEPARATOR = "___"

export interface CardParts {
  front: string
  back: string
  references: string
}

export const parseCardContent = (raw: string): CardParts => {
  const [front = "", back = "", ...rest] = raw.split(CARD_SEPARATOR)

  return {
    front: front.trim(),
    back: back.trim(),
    // A `___` inside the references (a horizontal rule, say) belongs to them.
    references: rest.join(CARD_SEPARATOR).trim()
  }
}

# Skin-colour instruments — design

Two instruments for `societe/pourquoi-revenir-a-la-couleur-de-peau.md`. The note
is a James Baldwin monologue answering the question in its title — _why must we
always come back to skin colour?_ Baldwin never claims to read anyone's heart:
"I don't know if the real estate lobby is anything against black people, but I
know the real estate lobbies keep me in the ghetto." The thesis: **intent is
unknowable and beside the point; the pattern across independent institutions is
the evidence, and refusing the word does not undo the sorting.**

Two mechanics, two instruments — one per idea.

## `coincidence-stack` — the innocent-coincidence collapse

Baldwin lists institution after institution. Each single outcome is deniable:
"maybe that one isn't about colour." Grant each institution a _generous_
benefit of the doubt — the probability its outcome is innocent coincidence.
Then examine them together. The probability that they are _all_ innocent at
once is the product of the doubts, and it collapses.

- **Mechanic:** a checkbox per institution ("count this one"); a headline
  showing the product of the doubts of the ones counted.
- **Motion is honest:** the percentage is a derived function of _which_
  institutions are counted, recomputed on every toggle — not a counter ticking
  over time. At 50 % doubt each, every institution halves the innocence: 50 →
  25 → 13 → 6.3 → 3.1 %.
- **Colour:** the collapsing percentage turns `text-error` once it drops below
  10 % — the point where "coincidence" stops being credible.
- **Payoff:** _One outcome is a coincidence you can grant. Five independent
  institutions all sorting the same way — the innocence you'd have to believe is
  a rounding error. That is why you come back to colour._

Table-fed: `| Institution | Ce qu'on sait | Bénéfice du doute |`. The doubt is a
percentage; missing/garbage falls back to 50 %. Ships English `DEFAULT_*`.

## `colorblind-resort` — remove the word, keep the sorting

The other half of Baldwin's answer: you cannot opt out of colour by declining to
say it. Each row is a person taking the same action in two colours, and where
the institution places them. A single toggle drops the colour column to "—".
The destinations do not move.

- **Mechanic:** one toggle, "stop looking at colour". Colour cells blank; the
  sorting is untouched.
- **Felt number:** a tally of persons whose destination depends on colour —
  identical whether the word is named or hidden.
- **Colour:** destinations are the harm side, `text-error`; the hidden colour
  cells go grey (what goes unnamed).
- **Payoff:** _You removed the only word that explained the split. The split
  didn't move. Refusing to name colour doesn't unsort anyone; it only takes away
  your word for what happened._

Table-fed: `| Personne | Couleur | Où l'institution la place |`. Ships English
`DEFAULT_*`.

## Notes

- Figures are pedagogical, not empirical: 50 % doubt each is a round number a
  reader can hold, chosen so each institution visibly halves the innocence.
- Both leave the plain-markdown reading intact: the literal `:::name:::` line
  and a readable French table survive on GitHub.
- The note has no front matter / `atUri`; no ATProto republish needed.

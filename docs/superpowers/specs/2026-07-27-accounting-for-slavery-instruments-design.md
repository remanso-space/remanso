# Instruments for the *Accounting for Slavery* note

Date: 2026-07-27
Status: approved

## Goal

Three instruments for `lectures/accounting-for-slavery.pub.md`. Unlike the
existing instruments (timer, breath, kingman), these are not utilities — they
are rhetorical explorables. Each makes the reader perform an act of
quantification, then shows what the quantification erased.

The note's thesis is that abstraction is the mechanism of dehumanization: the
fractional-hand rating, distance-as-reification, the no-win logbook. Reading
about that is not the same as doing it.

## Shared constraints

- **Ledger aesthetic, never game aesthetic.** No score, no win state, no
  celebration, no streak, no sound. The output of every interaction is a
  ledger row.
- Every instrument ends on a confrontation, not a result.
- Same architecture as the existing instruments: a pure logic module with a
  unit spec, a Vue component with a vue-test-utils spec, one registry entry.
- No aliases. Three names: `prime-hand`, `quota-ratchet`, `reification`.

## `prime-hand` — the fractional-hand rater

Anchor: note line 102, the Rosenthal quote on rating people as one-quarter,
one-half, three-quarters of a prime hand.

Table-fed (`instrumentWantsTable`), so the note supplies real people rather
than the component hardcoding invented ones:

```markdown
:::prime-hand:::

| Person | Between the lines           | Picked |
| ------ | --------------------------- | ------ |
| Mary   | 14. Sized rather than aged. | 148 lb |
```

- Column 1 is the name, column 2 the human detail, column 3 (optional) the
  output figure.
- One person at a time. The detail is the largest text on the card.
- A slider snapping to ¼ / ½ / ¾ / 1 — the historical notation, no free
  values.
- "Record" collapses the card into a ledger row and drops the detail column.
- End state: the finished grid. Names, fractions, and
  `N people → X.XX hands`. The detail is gone.
- One button, "Restore the lines", puts the erased column back — the reader
  chose to erase it, and has to choose to look at it again.

`primeHand.ts`: `parsePeople(table)`, `snapFraction`, `formatFraction`
(¼ / ½ / ¾ / 1), `totalHands`, `formatHands`.

## `quota-ratchet` — the cotton-log ratchet

Anchor: note line 128 — "afraid of doing too much and of doing too little".

Args: `target=150 days=7` (pounds per day, number of days). Both optional.

- Each day the reader picks a number of pounds.
- Over target: the target permanently ratchets up to what was picked. Tomorrow
  starts there.
- Under target: one lash counted per missing pound, and rations denied for
  the day.
- Exactly on target: nothing. The only non-losing play, and it is unreachable
  in practice.
- The ratchet never falls. Both directions lose — that is the whole mechanic.
- End: `150 → 240 lb · 47 lashes · 3 days without rations`. A ledger, no
  verdict.

`quotaRatchet.ts`: `parseRatchetArgs`, `initialRatchetState`, `applyDay`
(pure state transition, trivially tested).

## `reification` — the distance dissolver

Anchor: note line 38 — distance enabled the mass reification of the enslaved.

A slider runs from the cotton row to London. As it moves, what reaches the
owner degrades through five representations:

`a person` → `a name and a task` → `a rating` → `a row in the monthly return`
→ `a portfolio total`

- The slider is logarithmic: the first mile matters as much as the last
  thousand.
- Ships with a default five-stage sequence so `:::reification:::` works bare;
  table-fed to override with `| Miles | What reaches the owner |`.
- **Dragging back does not restore.** Every stage the reader passes is added
  to a struck-through "lost between the lines" list that never shrinks.
  Reification is one-way, and the instrument refuses to pretend otherwise.

`reification.ts`: `sliderToMiles` (logarithmic, 0 → 0 mi, 100 → 4000 mi),
`parseStages`, `stageIndexAt`, `formatMiles`.

## Plumbing

Three registry loader entries. `prime-hand` and `reification` added to
`instrumentWantsTable`. Nothing else changes — `runInstruments` already
handles sibling-table extraction, mounting, and unmount-on-re-render.

## Tests

- `primeHand.ts`: fraction snapping, formatting, totals, table parsing with
  missing columns.
- `quotaRatchet.ts`: ratchet rises and never falls, lashes accumulate per
  missing pound, rations counted, day bounds.
- `reification.ts`: slider endpoints and monotonicity, stage lookup at
  boundaries, unsorted and empty tables.
- Components: rate-and-advance flow with the detail dropped then restored;
  over/under/on-target days producing the right ledger lines; passed stages
  persisting after the slider is dragged back.

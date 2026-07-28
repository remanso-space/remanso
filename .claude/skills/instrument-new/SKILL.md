---
name: instrument-new
description: Use when the user asks for a new explorable-explanation instrument for one of their notes, typically as `/instrument-new <approximate note name>` (e.g. `/instrument-new les 3 violences`, `/instrument-new bayes`). Resolves the fuzzy note name against the notes vault, checks whether an already-implemented instrument fits — wiring it into the note with a paragraph on why that mechanic belongs there — and otherwise designs and implements a new instrument, inserts it in the note, verifies, then commits and pushes both repositories.
---

# New instrument for a note

An instrument is a small interactive component embedded in a note with
`:::name args:::`. It exists to make one idea _felt_ rather than described: the
mechanic **is** the argument. `reification` makes you slide away from a cotton
row until a girl becomes a number in a portfolio; `quota-ratchet` hands you a
game whose target only ever rises; `naming-filter` widens the word "violence"
and shows the harm stops hiding rather than growing.

This skill takes an approximate note name and ends with the note carrying an
instrument that earns its place.

## Input

The argument is a fuzzy note name — a slug fragment, a heading, a topic. It may
be accented or not, spaced or hyphenated: `les 3 violences`, `3-violences`,
`accounting for slavery`, `bayes`.

Paths:

- notes vault: `/home/jean/projects/notes` (separate git repo)
- Remanso: `/home/jean/projects/remanso`

If the vault is missing, ask for its path rather than guessing.

## Step 1 — resolve the note

Match the argument against filenames and first-level headings. Accents and
hyphens must not decide the match.

```bash
fd -e md . /home/jean/projects/notes | rg -i '3.?violence'
rg -il --glob '*.md' '^#\s.*violence' /home/jean/projects/notes
```

- Exactly one plausible hit → use it, state which file you picked.
- Several → AskUserQuestion listing the candidates with their folder.
- None → stop and say so. Do not invent a note or create one unasked.

## Step 2 — read the note

Read the whole file. Extract, explicitly:

- **The thesis** — the one claim the note exists to make. The instrument serves
  this claim or it does not ship.
- **Language** — French notes get French data tables and French prose. Component
  UI labels stay English, matching every existing instrument.
- **Existing instruments** — any `:::name:::` blocks already present, so you
  complement rather than repeat.
- **Front matter** — a `.pub.md` with an `atUri` is published through ATProto and
  needs republishing after the edit. Say so at the end; do not republish.

## Step 3 — inventory what already exists

Never work from memory of the instrument set. Read it:

```bash
cat /home/jean/projects/remanso/src/modules/instruments/registry.ts
```

Then read the doc comment at the top of the logic module for any instrument that
looks close. As of 2026-07-28 the set is:

| Instrument           | Mechanic                                                    |
| -------------------- | ----------------------------------------------------------- |
| `timer`, `stopwatch` | countdown with a beep; elapsed time with laps               |
| `until`, `since`     | days to or from a date                                      |
| `flashcards`         | table rows as recall cards                                  |
| `intervals`          | a timed sequence read from a markdown list                  |
| `takt-time`          | demand and available time into a takt                       |
| `urn`                | draws from an urn, sampling by hand                         |
| `bayes`              | prior, sensitivity, false positive rate into a posterior    |
| `kingman`            | utilization into queue wait — the hockey stick              |
| `breath`             | a paced breathing cycle                                     |
| `prime-hand`         | rate people as ¼ to a full hand and watch the life drop out |
| `quota-ratchet`      | a quota that rises when met and is paid for when missed     |
| `reification`        | distance from the work turning a person into a figure       |
| `silent-gears`       | an unlabelled toll accumulating beside a named one          |
| `naming-filter`      | widening a word without adding any harm                     |

## Step 4 — branch A: an existing instrument fits

Prefer this branch. A note that can borrow `urn` or `quota-ratchet` should
borrow it. Then:

1. Insert the `:::name args:::` block at the point in the note where the reader
   has just met the idea and not yet been convinced by it.
2. Give it a data table in the note's language (see Step 6, data), unless the
   instrument takes only inline args.
3. Write two to four sentences above the block on **why this mechanic belongs to
   this note** — what the reader is meant to do with it and what they should
   notice. This is the deliverable of this branch, not decoration.

No code changes. Skip to Step 8.

## Step 5 — branch B: design a new instrument

Propose 2–4 candidates, one line each: the mechanic, then what it makes felt.
Say which you would pick and why. Wait for the user to choose before writing any
code.

A candidate is worth proposing only if:

- **One mechanic.** A slider, a clock, a log, a draw — not three.
- **The mechanic carries the argument.** If a sentence would land the same point,
  there is no instrument here.
- **It has a payoff line.** State the sentence the reader leaves with. If you
  cannot write that sentence, the design is not finished.
- **Motion is honest.** A number derived from the inputs is a constant; do not
  animate it and imply it accumulates. Live counters accumulate, ratios hold.

## Step 6 — implement

Follow the shape of `silentGears.ts` / `SilentGearsInstrument.vue`. Read both
before starting.

**Logic** — `src/modules/instruments/<name>.ts`, pure, no Vue import:

- exported types for the domain, doc-commented in the note's own vocabulary
- `parse<Name>Args(args: string)` when it takes inline args, clamped, with named
  defaults and a fallback on nonsense
- `parse<Rows>(table?: InstrumentTable)` when it is table-fed, falling back to
  exported `DEFAULT_*` data
- the computation, as small pure functions

**Component** — `src/modules/instruments/components/<Name>Instrument.vue`:

- `<script setup lang="ts">`, `defineProps<InstrumentProps>()` from `../sibling`
  — every instrument takes the same three props, `sibling` included even when
  unused (an undeclared prop leaks as a `sibling="[object HTMLDivElement]"`
  attribute)
- every instrument gets the element rendered right after its placeholder,
  whatever it is. Read it with `consumeTable(props.sibling)` (table-fed: reads
  and hides it) or `readList(props.sibling)` (list-fed: stays visible) from
  `../sibling`. Both return `undefined` when the sibling is some other shape —
  fall back to `DEFAULT_*` data, never throw.
- outer div: `class="instrument mx-auto my-4 w-full max-w-md rounded-box border border-base-300 bg-base-100 p-3"`
- Tailwind + DaisyUI only. Accents use `text-(--link-accent)`, never raw
  `text-accent`. Counts of dead or harmed use `text-error`.
- Tabler icons pasted inline with `stroke="currentColor"`
- ticking is timestamp-based (`Date.now()` against an anchor), never accumulated
  from interval callbacks; `onUnmounted` clears every interval
- stable hook classes on the elements the tests read (`.gears-count`,
  `.filter-tally`)
- no persisted state

**Registry** — `src/modules/instruments/registry.ts`: the loader entry. Nothing
else — what an instrument reads from its sibling is its own business.

**Tests** — `<name>.spec.ts` beside the logic and
`components/<Name>Instrument.spec.ts` beside the component:

- logic: parsing, defaults, fallbacks, clamping, the arithmetic, the edges
- component: mount it, drive the real inputs, assert the DOM. Build the data
  sibling with `tableSibling(table)` / `listSibling(items)` from
  `@/test/instrumentSibling`. Fake timers for anything that ticks
  (`vi.useFakeTimers()` in `beforeEach`).
- `wrapper.text()` concatenates adjacent nodes without spaces — expect
  `"Station burns2"`, not `"Station burns 2"`.

**Data** — the note's table is the source. Ship `DEFAULT_*` data in the module as
a fallback only, so a bare `:::name:::` still renders. Never hardcode the note's
figures in the component. Parse numbers by stripping non-digits so `9 000 000`
and `9,000,000` both read. Accept French and English spellings for any
enumerated column.

## Step 7 — insert into the note

```markdown
## A heading in the note's language

Two to four sentences: what to do with the instrument and what to notice.

:::name:::

| Column | Column | Column |
| ------ | ------ | ------ |
| …      | …      | …      |
```

The table must be the immediate next block after the placeholder — that element
is what the instrument is handed, and `consumeTable` hides it. Place the section where the argument needs
weight, before the `---` and `## Références` block.

## Step 8 — verify

```bash
cd /home/jean/projects/remanso
pnpm test --run src/modules/instruments/
pnpm types
pnpm lint
pnpm fmt
git status --short   # oxfmt reformats pre-existing files it touches
```

`pnpm fmt` runs repo-wide and will reformat files unrelated to this work. Revert
those before committing:

```bash
git checkout -- <each unrelated path oxfmt touched>
```

Claim nothing passes without the output in front of you.

## Step 9 — review, then commit and push

Show the user what changed — files, the note section, the payoff line — and wait
for validation. Then commit both repos. Match the commit convention already in
each repo's `git log` (Conventional Commits, imperative, scoped):

```bash
cd /home/jean/projects/remanso && git add <paths> && git commit && git push
cd /home/jean/projects/notes  && git add <path>  && git commit && git push
```

- Remanso: `feat(instruments): …` for a new instrument, `docs(instruments): …`
  for wiring only.
- Notes: `docs(<folder>): …`.
- Remanso pushes to two remotes at once; both lines in the push output are
  expected.
- Close by reminding the user to republish if the note is a `.pub.md`.

Write a design doc under `docs/superpowers/specs/<date>-<topic>-instruments-design.md`
only when the run adds two or more instruments, or changes how instruments work.
A single instrument does not need one.

## Guardrails

- The note's thesis decides everything. An instrument that is fun and off-thesis
  is a regression.
- One mechanic per instrument. Two ideas means two instruments.
- Figures are orders of magnitude, not precision — say so in the module doc
  comment, and prefer round numbers a reader can hold.
- A derived constant must not be dressed as a live counter. Spell a ratio out as
  "N to 1" beside a counter that genuinely moves.
- Colour carries meaning: grey is what goes unnamed, `text-error` is what it
  costs. Do not spend red on decoration.
- Leave the plain-markdown reading intact. Someone browsing the note on GitHub
  sees the literal `:::name:::` line and a readable table; that has to still make
  sense.

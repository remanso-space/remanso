# Todo — breath instrument + note instruments (2026-07-27)

## Remanso

- [ ] `src/modules/instruments/breath.ts` — parse `4-7-8`, `4-4-4-4`, `5-5`,
      optional `xN` cycles; positional phase kinds (inhale / hold-in / exhale /
      hold-out); pure scale math for the animated circle.
- [ ] `breath.spec.ts` — parser + scale unit specs.
- [ ] `components/BreathInstrument.vue` — animated circle, phase label,
      countdown, cycle counter, start/pause/reset. No audio (calm by design).
- [ ] `components/BreathInstrument.spec.ts` — fake-timer component spec.
- [ ] `registry.ts` — register `breath`.
- [ ] Update instruments design doc (third wave: kingman + breath).
- [ ] `pnpm test`, `pnpm types`, `pnpm lint`.

## Notes vault (/home/jean/projects/notes)

- [ ] `japonais/ma.pub.md` — `:::breath 4-7-8 x4:::` (the hold *is* the ma).
- [ ] `lean/tps/just-in-time.pub.md` — `:::takt-time 12 / 480m:::` (rythme) and
      `:::kingman u=85% ca=1 cs=1:::` (why parallel work stretches lead time).
- [ ] `code/my-journey-in-the-at-proto-world.pub.md` — `:::since 2021-03-08:::`
      (first commit in the notes repo, backs the "5 years" claim).

## Review

All items done. `pnpm test` 58 files / 477 tests pass (21 new: 13 parser + 8
component), `pnpm types` clean, `pnpm lint` clean, `pnpm build` succeeds.

Notes: the two lean instruments went into their own `##` sections at the end of
`just-in-time.pub.md` rather than inside the "accomplissement" list — inserting
them mid-list orphaned the Cal Newport paragraph from its own list. Kingman links
to the existing `lean/loi-de-little.md` (which already carries the formula and
the same instrument) instead of a note that does not exist.

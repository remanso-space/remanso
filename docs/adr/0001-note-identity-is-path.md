# Note identity is Path, not SHA

A **Note**'s stable identity is its **Path** (its location in the repo, e.g. `ideas/zettel.md`), not its content **SHA**. We decided this because authors link to Notes by path (markdown `[[…]]` resolved via `resolvePath()`) and expect those links to survive edits — whereas a Note's SHA changes on every edit.

This is surprising in the current code, which keys **Backlinks** (`Backlink { sha }`) and the stacked-notes URL (`?stackedNotes=sha1;sha2`) by SHA. Those are runtime *handles* that must resolve *through* the Path; if a SHA-handle ever disagrees with the Path, the Path wins.

## Considered options

- **Path as identity (chosen).** Survives edits; matches how authors write links. Cost: needs a resolution layer mapping Path → current SHA for lookup/navigation, and the SHA-keyed code is a known fragility to reconcile.
- **SHA as identity (rejected).** Matches the current code literally and needs no resolution layer, but every edit produces a new identity — backlinks and open-note URLs would break on edit. Unacceptable for a notes app where editing is routine.

## Consequences

- Backlinks and stacked-note navigation should ultimately be expressed in terms of Path; SHA-keying stays only as an internal lookup handle.
- Caching by SHA remains valid (it is content-addressed versioning), but Note identity must never be conflated with it.

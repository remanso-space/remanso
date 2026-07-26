---
status: accepted (refines ADR-0001)
---

# Two reference modes: Live (Path) and Snapshot (SHA)

A reference to a Note resolves in one of two deliberate modes. A **Live reference** (by **Path**) resolves to the Note's _current_ content — this is a Backlink you follow in your own repo, and it reflects edits (Note identity = Path, per ADR-0001). A **Snapshot reference** (by **SHA**) resolves to that _exact, immutable_ version — this is a shared or bookmarked stack link (`?stackedNotes=sha`), content-addressed so what was shared cannot change underneath a reader.

This refines ADR-0001, which framed SHA-keyed references as "a fragility." That framing was too absolute: SHA-pinning is the **correct** tool for a Snapshot reference. Pinning is an _integrity_ feature — it guarantees a shared view can't be silently rewritten, so no reader is misled and no author is misrepresented.

## Considered options

- **Two explicit modes (chosen).** Live=Path, Snapshot=SHA, each with a clear purpose. Cost: the resolver must support both, and the UI must make the mode legible (you should know whether you're reading "now" or "as shared").
- **Single mode, Path only (rejected).** Simpler, but a shared link would always re-resolve to current content — destroying the integrity guarantee that makes sharing safe.
- **Single mode, SHA only (rejected by ADR-0001).** In-repo navigation would break on every edit.

## Consequences

- The system **pre-caches** aggressively (content is cached by both SHA and Path on every fetch / freshness pull) so the pinned version is usually present, including offline.
- **Cache shape (C3/C4):** content is cached under two keys — its own **content SHA** (write-once, immutable → the snapshot store) and its **Path** (overwritten with the latest content → the live pointer). Both hold the full content, so the latest survives even if a SHA entry is evicted, maximizing offline availability for any version already encountered. (Today the code violates this by writing edited content under the _viewed_ old SHA key; the fix is to write under the content's _new_ SHA and never overwrite an existing SHA entry.)
- When a Snapshot reference's pinned content is genuinely unavailable (never-fetched + offline — common on a flaky mobile connection), the system **falls back to the most up-to-date cached version and shows a banner** disclosing "this is the latest available, not the exact shared version." Integrity is preserved by **disclosure, not refusal**: the reader is never silently shown different content, but is also never dead-ended on the metro. (This chooses graceful continuity over a hard "unavailable" stop, given mobile is the primary read context.)

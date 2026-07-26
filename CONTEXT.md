# Remanso

Remanso displays markdown **Notes** from GitHub repositories with Zettelkasten-style backlinks, and publishes/reads decentralized public notes over ATProto. This glossary is the shared vocabulary for the domain — it must appear verbatim in code, tests, commits, and docs.

**Naming convention:** Themed river/Amazonian names (after _Remanso_, a still backwater) are used for **user-facing surfaces and places** (e.g. **Igarapé**). **Core technical concepts** keep their standard Zettelkasten/Obsidian names (**Note, Backlink, Path, Card, Draft, Fleeting**) for discoverability.

## Language

### Core note model

**Note**:
A single markdown document in a repository, identified by its **Path**. Editing a Note does not change its identity.
_Avoid_: "file" when you mean the semantic document.

**Path**:
A Note's stable identity — its location within the repo (e.g. `ideas/zettel.md`). What authors link to and what survives edits.

**SHA**:
The git blob hash of a Note's content — a _content version_, not the Note's identity. Changes on every edit. Legitimately used as the address of a **Snapshot reference** (an immutable shared version).
_Avoid_: treating SHA as the Note's _identity_ (identity is **Path**); but SHA _is_ the right address for an immutable snapshot.

**File** / **RepoFile**:
The repo artifact carrying a Note's metadata (`path`, `sha`, `size`, …) as returned by the GitHub API. A File is how a Note appears in a repo listing, not a separate domain entity.

### Note kinds

A Note's kind is inferred from its folder, not stored as a field.

**Fleeting Note**:
A transient, quick-capture Note you later distill into a permanent one (Zettelkasten sense). Stored under the `inbox` / `_inbox` folder.
_Avoid_: "Inbox Note" for the concept — `inbox` is only the storage folder convention; the domain term is Fleeting Note.

**Draft Note**:
A work-in-progress Note, stored under the `drafts` / `_drafts` folder.

**Task**:
An actionable item in `todo.txt` (todo.txt format); may recur. Completing a Task archives it to `done.txt`, and for a recurring Task schedules the next occurrence. A Task is not a Note.
_Avoid_: "Todo Note" — Tasks live in a single todo.txt file, not as Notes.

### Reading & navigation

**Igarapé**:
The primary reading surface — the channel you travel as you read a Note and follow its backlinks (Amazonian/Tupi: a narrow navigable waterway through the forest). Any kind of Note appears in the Igarapé. Named to extend the river metaphor set by _Remanso_ (a still backwater).
_Avoid_: "Flux" (dropped — internal jargon, no domain meaning).

**Index**:
A flat listing of every Note in a repo (path, sha, size). A catalogue view, unrelated to time or edits.
_Avoid_: "History" / "Historic Notes" for this — it is an index, not a chronological record.

**History**:
The chronological log of repos the user has recently visited (powers the "last visited" navigation).
_Avoid_: using "history" for the Note **Index**, or for edit/version tracking (no such feature exists; there is no "edit history").

**Backlink**:
An inbound reference to a Note — another Note that links to it. The Zettelkasten/Obsidian standard term (kept plain per the naming convention).

**Stacked Notes**:
The navigation pattern in the **Igarapé** where following a Backlink opens the target Note alongside the current one, accumulating a horizontal stack you can read across.

**Live reference**:
A reference to a Note **by Path** that resolves to its _current_ content (e.g. a Backlink you follow in your own repo). Reflects edits.

**Snapshot reference**:
A reference to a Note **by SHA** that resolves to that _exact, immutable_ version (e.g. a shared/bookmarked stack link). Content-addressed; deliberately unaffected by later edits, so what was shared cannot change underneath a reader. Not a fragility — an integrity feature.

### Spaced repetition

**Card**:
A flashcard reviewed via spaced repetition — its content (front, back, references) and its review schedule together form one Card. Content lives in `_cards/` markdown; the schedule lives in the local DB (an implementation split, not two domain concepts).
_Avoid_: using "Card" to mean only the content, or only the schedule. The pair (`Repetition` in code) **is** the Card.

**Level**:
A Card's mastery level (1–8); higher levels space reviews further apart.

**Need-review**:
A Card the user has manually flagged to resurface for review, independent of its scheduled date.

### Decentralized publishing (ATProto)

**Published Note**:
A Note published to the decentralized ATProto network as a `space.remanso.note` record, addressed by **DID** + **rkey** (not by Path). A distinct entity created by publishing a Note; carries its own snapshot (title, images, content, theme, language).
_Avoid_: "Public Note" — reserve "public" for a Note in a public GitHub repo (see below).

**Publish**:
The act of making a Note public as a **Published Note**, via a single low-friction gesture — suffixing the file `*.pub.md` in the IDE — rather than an in-app form. "Lower every wall to make your voice public."

**DID**:
The decentralized identifier of a Published Note's **Author** (e.g. `did:plc:…`). Standard ATProto term.

**rkey**:
The record key identifying one Published Note within an Author's PDS repo. Standard ATProto term.

**Author**:
The publisher of a Published Note — a `handle` plus a **PDS**, resolved from a DID.

**PDS**:
Personal Data Server — where an Author's ATProto records (and image blobs) are hosted.

## Relationships

- A **Note** is identified by exactly one **Path**.
- A **Note** has one current **SHA**, which changes on every edit.
- A **File** is the repo-listing view of a **Note** (it carries the Note's Path and current SHA).
- A **Note** can be published as a **Published Note**, which is then addressed by **DID** + **rkey** instead of Path.
- A **Published Note** has exactly one **Author**; an **Author** is identified by a **DID** and hosted on a **PDS**.
- Following a **Backlink** in the **Igarapé** produces **Stacked Notes**.

## Example dialogue

> **Dev:** "When I follow a **Backlink** in the **Igarapé**, do I navigate by **Path** or **SHA**?"
> **Maintainer:** "The identity is the **Path** — that's what the link author wrote. The **SHA** is just the current content version; we happen to use it as a runtime handle, but if it ever disagrees with the Path, the Path wins."
>
> **Dev:** "And if I publish this **Note**?"
> **Maintainer:** "It becomes a **Published Note** — a separate ATProto record addressed by **DID** + **rkey**, not by Path. The repo **Note** stays as it is."

## Flagged ambiguities

- **Identity = Path; two reference modes (refined 2026-06-28)** — see [ADR-0001](docs/adr/0001-note-identity-is-path.md). A Note's _identity_ is its **Path**, so **Live references** (Backlinks in your repo) must resolve to current content. But a **Snapshot reference** (a shared `?stackedNotes=sha` link) deliberately pins a **SHA** for immutability — that is an integrity feature, not a fragility. The earlier framing of "SHA-as-handle = fragility" was too absolute; ADR-0001 is to be amended to record both modes.
- `useNotes()` / `useFolderNotes()` are named "notes" but return `RepoFile[]`. Per this glossary they return **Files** (the repo-listing view), not `Note` objects — a naming drift to reconcile in code.
- `FluxNote` / `FluxNoteView` should be renamed to **Igarapé** (`Igarape` / `IgarapeView`) in code — "Flux" is dropped jargon.
- `HistoricNotes` view (route `/history`) is the **Index**, not history — rename to `NoteIndex` and move off the `/history` path.
- `CLAUDE.md` describes `modules/history/` as "Edit history tracking" — incorrect; it is the visited-repos **History**. Correct the doc; there is no edit-history feature.
- Card cluster: `Repetition` (the content+schedule pair) **is** the **Card** — rename `Repetition` → `Card`. The content-only struct and `RepetitionCard` (schedule) become named sub-parts (e.g. `CardContent`, `ReviewSchedule`). The hook already calls the pairs `cards` — make the types agree.
- ATProto cluster: rename `PublicNote` / `PublicNoteRecord` / `PublicNoteListItem` → `PublishedNote*`, and move `PublicNoteListItem` out of `Note.ts` into the `atproto` module (it is not a repo-Note concept).
- "Public" is overloaded: a Note in a **public GitHub repo** (auth-free access) vs the ATProto entity (now **Published Note**). Resolved — "public" refers only to repo visibility.

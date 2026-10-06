# Creative Brief

PR 13 installs the first user-authored creative-planning stage.

The Creative Brief sits between the approved Music Map and concept
development. It records what the user wants before PR 14 generates or compares
concepts. The software does not silently choose a creative direction here.

## Prerequisite

The current Music Map must be LOCKED before a Creative Brief can be created.

Each CreativeBriefVersion pins exactly one MusicMapVersion. This makes later
concepts reproducible against the exact musical interpretation the user had
approved when the brief was authored.

## Structured brief

The draft records:

- primary objective;
- intended audience;
- desired feelings;
- tonal directions;
- explicit narrative / performance / abstract percentages;
- literal-to-metaphorical mode and notes;
- artist-presence mode and notes;
- relationship between picture and song/lyrics and notes;
- required imagery;
- imagery to avoid;
- evolution across the song;
- ending / resolution;
- recurring symbols and motifs;
- cultural or period influences;
- references;
- production/content/format constraints;
- additional notes.

No creative options are preselected. A new brief starts empty, including a
0/0/0 form mix, and requires the user to make the governing decisions.

## Completion requirements

A brief cannot be completed until it has:

- a primary objective;
- an audience;
- at least one desired feeling;
- at least one tonal direction;
- narrative/performance/abstract percentages totaling exactly 100%;
- a literal/metaphorical mode;
- an artist-presence decision;
- an image/song relationship;
- an evolution across the song;
- an ending/resolution.

Optional lists can remain empty when they genuinely do not constrain the
project.

## Versioning

CreativeBrief is the project-level logical identity.

CreativeBriefVersion is append-only and carries:

- DRAFT / LOCKED / SUPERSEDED lifecycle;
- exact source MusicMapVersion;
- optimistic revision;
- complete structured brief JSON;
- semantic domain node and fingerprint;
- creator and timestamps.

If the current locked Music Map changes, the UI marks the brief as needing a
rebase. Starting a new brief version pins the latest locked map and carries the
previous user-authored brief forward as an editable starting point. The prior
version remains intact.

## Dependency graph

Music Map -> Creative Brief uses REFERENCES.

Creative Brief is a semantic REVIEW node. A material brief change marks
already-touched downstream wizard work NEEDS_REVIEW while preserving locked
content.

The semantic fingerprint contains both the exact source Music Map version ID
and the structured brief. Repointing an otherwise identical brief to another
map is therefore a material dependency change.

## Autosave and concurrency

The editor autosaves after 700 ms of inactivity.

Every save requires the current CreativeBriefVersion revision. A stale request
returns HTTP 409 and rolls back. Brief data, fingerprint, wizard state, and
downstream invalidation are committed in the same serializable PostgreSQL
transaction.

## Completion, reopening, and locking

Completion validates all governing decisions but does not lock the brief.

A completed, unlocked brief can be reopened. Later concepts/treatments are
flagged for review when the brief materially changes.

Locking freezes both the CreativeBriefVersion and the Creative Brief wizard
stage for the current ProjectVersion in the same transaction.

## PR 14 contract

PR 14 concept development must consume the locked Creative Brief rather than
inventing its own objectives or constraints. Concept generation may propose
creative solutions, but it must expose and compare them against the user's
brief.

## Validation

CI includes a real PostgreSQL Creative Brief smoke test covering:

- locked Music Map prerequisite;
- exact source-map pinning;
- REFERENCES dependency provenance;
- empty/unselected initial state;
- completion rejection for incomplete briefs;
- autosave persistence;
- semantic downstream NEEDS_REVIEW invalidation;
- completion;
- reopen and revision;
- locking;
- generic graph-lock compatibility;
- post-lock mutation rejection;
- detection of a newer locked Music Map.

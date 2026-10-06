# Music Map

PR 12 separates machine analysis from human musical interpretation.

Music Analysis remains immutable evidence. A Music Map is the user's curated
timing and structure layer that later creative-planning, storyboard, shot, and
automatic-edit systems can pin exactly.

## Domain model

Each project has one logical MusicMap with append-only MusicMapVersion records.

A version pins exactly one MusicAnalysisVersion and owns:

- a domain-version node;
- DRAFT / LOCKED / SUPERSEDED lifecycle;
- optimistic revision number;
- approved tempo/meter/grid configuration;
- exact beat grid and bar grid arrays;
- duration;
- ordered musical/editorial anchors.

Each MusicMapAnchor records:

- source: ANALYSIS or USER;
- kind: section, intro, outro, beat, bar, drop, transition, vocal passage,
  instrumental break, or custom;
- decision: PENDING, ACCEPTED, or REJECTED;
- user-facing label;
- exact start and optional end milliseconds;
- original machine timing for analysis-derived anchors;
- machine confidence where available;
- source metadata.

Rejected machine candidates are retained. They are decisions, not deleted data.

## Initialization and re-analysis

The first map version is seeded from the latest Music Analysis version.

Analysis-derived candidates include estimated:

- sections;
- intro/outro;
- drops;
- editorial transition anchors;
- timestamped vocal passages;
- instrumental breaks.

The analyzer's exact beat and bar arrays are copied into the map as the initial
grid.

If a newer analysis becomes available, the UI identifies that the map is based
on an older analysis. Creating a new map version preserves the old version.
Custom user anchors are carried forward when the analysis changes; old
analysis-derived accept/reject decisions are not guessed onto materially
different machine candidates.

When a locked map is reused under a later ProjectVersion against the same
analysis, its curated anchors/grid can seed a new DRAFT map version.

## Human correction

The user can:

- accept or reject every machine candidate;
- rename candidates such as sections;
- move candidate start/end times while preserving the original analysis timing;
- add custom anchors;
- delete custom anchors;
- correct BPM, meter, beat offset, and bar phase;
- restore the exact original analysis beat/bar grid at any time.

A manual tempo correction produces explicit beat and bar arrays immediately.
Later stages consume those arrays, not an implicit tempo calculation.

## Completion and locking

A map cannot be marked complete while machine candidates remain PENDING.
This prevents silent acceptance or rejection.

At least one anchor must be ACCEPTED before completion.

Completion is distinct from locking:

- COMPLETED means the map is ready for downstream creative work.
- editing a completed but unlocked map reopens it and marks materially affected
  downstream stages NEEDS_REVIEW.
- LOCKED freezes the MusicMapVersion and the wizard stage for the current
  ProjectVersion.

## Dependency graph

Music Analysis -> Music Map uses DERIVED_FROM.

Music Map is a semantic domain node: if it later changes, dependent semantic
work should be reviewed rather than blindly regenerated. Its domain-node
fingerprint is refreshed from the complete curated semantic snapshot on every
mutation.

## Concurrency

Every map mutation requires the current MusicMapVersion revision. Stale
requests return HTTP 409 and roll back transactionally.

Wizard status, map content, node fingerprint, and downstream review
invalidation are updated in the same serializable PostgreSQL transaction.

## Validation

CI includes a real PostgreSQL Music Map smoke test that verifies:

- seeding from a pinned analysis version;
- dependency provenance;
- machine timing preservation after user correction;
- custom anchors;
- manual beat/bar grid correction;
- downstream NEEDS_REVIEW invalidation;
- auditable bulk rejection of remaining candidates;
- completion requirements;
- map/wizard locking;
- generic dependency-graph lock compatibility;
- post-lock mutation rejection.

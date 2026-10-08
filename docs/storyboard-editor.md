# Storyboard Editor

PR 23 turns the automatic Storyboard Engine output into a version-safe editing
workspace.

## Versioning rule

The editor never rewrites an existing ShotVersion in place. Any semantic edit
creates a new ShotVersion and updates the active SequenceVersionShot link to the
new exact version. Replaced draft versions are marked SUPERSEDED.

This preserves provenance for later dependency analysis, regeneration, and
reproducible project archives.

## Supported editing operations

### Rewrite

Any storyboard shot can be revised field-by-field: label, visual beat, dramatic
purpose, subject, action, environment, framing, camera intent, continuity,
transitions and visual intensity. Exact timing is preserved by a rewrite.

### Split

A shot can be split at an exact millisecond. The first half becomes a new
version of the original logical Shot; the second half becomes a new logical
Shot. Sequence coverage remains continuous.

### Duplicate

Duplicate creates a second copy of the selected shot by dividing its existing
time span at the midpoint. This preserves continuous timing instead of
creating overlapping picture.

### Merge

Two adjacent shots can be merged. The merged ShotVersion spans both time
ranges, combines their creative descriptions, and removes the second active
link while preserving its historical versions.

### Reorder

Shots can move up or down. Reordering preserves each shot's duration and
recomputes contiguous absolute timing from the sequence start.

### Targeted regeneration

A single shot can be regenerated through a durable text-generation job. The
provider receives the selected shot, its exact locked SequenceVersion context,
and adjacent shots for continuity. The generated replacement must preserve the
exact start and end milliseconds.

The result is stored as a new ShotVersion with REGENERATED provenance and the
generation job ID.

## Completion and locking

Manual edits reopen the Storyboard stage and invalidate touched downstream
work. Completion revalidates every active sequence for continuous coverage and
any explicit Sequence Map target shot count.

Locking locks every active ShotVersion and the Storyboard wizard stage. Once
locked, PR 24 can safely compile reproducible detailed shot specifications from
an immutable storyboard.

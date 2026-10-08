# Refinement runtime

PR 38 creates a non-destructive working edit derived from the locked Automatic First Cut.

## Working timeline

Refinement uses the existing `WORKING` Timeline kind.

Initialization clones the locked First Cut into a new working TimelineVersion while preserving:

- exact audio-master AssetVersion;
- exact Shot Specification references;
- exact selected Video Clip AssetVersions;
- source ranges;
- timeline timing;
- transition records.

The locked First Cut is never mutated.

## Immutable edits

Every manual edit creates a later TimelineVersion.

The immediately prior working version is superseded, preserved in history, and recorded as the new version's parent. The new timeline node has dependency edges to both:

- the locked First Cut source;
- the immediately prior working timeline version.

This gives both stable source provenance and a complete edit history.

## Supported refinement operations

### Move a cut boundary

A cut between adjacent items can move earlier or later while preserving total continuous timeline coverage.

The service recalculates both adjacent editorial durations and source ranges. It rejects the change when a selected clip does not contain enough source media.

### Replace a clip

A timeline item can switch to another generated Video Clip AssetVersion only when that alternative was generated from the same locked Shot Specification.

Timing is preserved. Source-duration compatibility is validated.

### Change a transition

A transition between adjacent items can change kind, duration, and manual note.

Transition duration may not exceed either adjacent editorial item.

## Concurrency

Every edit requires both:

- the expected wizard revision;
- the expected current TimelineVersion ID.

A stale browser therefore cannot silently overwrite a newer refinement version.

## Completion and locking

Refinement remains editable while its current TimelineVersion is `DRAFT`.

Completing the stage validates the full continuous working timeline and marks the wizard stage complete without flattening it.

Locking then locks the current working TimelineVersion and the wizard stage together. Finish & Export can consume only that locked working timeline.

## Clip alternatives

Refinement state exposes all ready generated-video AssetVersions that share the exact Shot Specification source for each item, including signed preview URLs. This supports choosing an earlier or alternate generation without losing history.

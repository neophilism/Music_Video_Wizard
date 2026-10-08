# Automatic First Cut runtime

PR 36 compiles the complete locked generated-video set into a versioned timeline aligned to the immutable audio master.

## No new persistence model

The project already contains the correct editorial primitives:

- `Timeline`;
- `TimelineVersion`;
- `TimelineItem`;
- `TimelineTransition`.

The First Cut uses those records directly rather than introducing a parallel edit model.

## Source boundary

Compilation is allowed only after Video Clips is locked.

Every timeline item pins:

- the exact locked Shot Specification version;
- the exact current Video Clip AssetVersion;
- locked Storyboard start/end timing.

The TimelineVersion pins:

- the exact ProjectVersion;
- the exact immutable audio-master AssetVersion.

## Timing

The compiler refuses to silently repair timing.

The locked source set must:

- start at 0 ms;
- contain positive exact millisecond durations;
- cover the song continuously without gaps or overlaps;
- have generated clips at least as long as their editorial duration.

Timeline item source ranges begin at 0 so the approved Initial Frame remains the first visible frame. Extra generated duration remains available after the editorial endpoint for later refinement.

## Transitions

Transition intent is preserved from the locked Shot Specifications on every adjacent pair.

The compiler identifies common transition kinds such as cuts, dissolves, fades, wipes, whips, morphs, and match cuts.

A transition receives a non-zero duration only when the locked text explicitly states one, such as `500 ms` or `0.5 s`. Unspecified transition timing is preserved as intent with duration zero rather than inventing an editorial duration.

## Versioning

The first build creates a `FIRST_CUT` timeline and TimelineVersion.

Rebuilding after a material source change:

- supersedes prior draft First Cut versions;
- creates a later TimelineVersion;
- links it to the previous version as its parent;
- preserves historical timeline versions.

If the exact source fingerprint has not changed, a repeated build reuses the current version instead of creating a duplicate.

## Dependency graph

The TimelineVersion node records dependencies from:

- the immutable audio-master AssetVersion;
- every exact Video Clip AssetVersion;
- every exact Shot Specification version.

This makes the edit reproducible from its source versions without relying on mutable "latest" pointers.

## Wizard behavior

A valid compilation automatically completes the Automatic First Cut stage.

The stage can then be locked only if the timeline still matches the current locked Video Clip set and audio master. Locking locks the TimelineVersion and the wizard stage together.

## Rendering boundary

PR 36 compiles the editorial timeline. It does not render a flattened video file.

Rendering, manual editorial refinement, and final export remain downstream responsibilities.

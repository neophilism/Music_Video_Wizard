# Sequence Map

PR 21 inserts a concrete Sequence Map between the locked Song-to-Picture Plan
and Storyboard generation.

Each Song-to-Picture passage becomes a real logical `Sequence` with a
versioned `SequenceVersion`. The active draft ProjectVersion pins the exact
sequence versions in order through `ProjectVersionSequence`.

## Source provenance

Every materialized sequence stores the exact locked Song-to-Picture Plan
version and node ID, the source passage index, and the source passage's creative
state: dramatic purpose, picture/narrative/character/performance/world/motif
state, Creative Language application, camera/motion intent, editing rhythm,
transitions and visual intensity.

A dependency edge also links the Song-to-Picture Plan node to every generated
SequenceVersion node.

## Editable planning layer

The Sequence Map is not another prose treatment. It is the first concrete
planning layer. Users can refine:

- sequence title;
- summary;
- dramatic purpose;
- exact start/end timing;
- optional target shot count; and
- planning notes.

The underlying source passage context remains pinned in structured provenance.

## Rebase and version behavior

If the locked Song-to-Picture Plan changes, re-materializing the map creates
new SequenceVersions for the same logical sequences where possible. Previous
draft versions are superseded rather than silently rewritten.

Completing the stage validates continuous zero-gap coverage from 0 ms through
the exact song duration. Locking the stage locks all active SequenceVersions.

The next PR builds storyboard beats and frames from these exact locked
sequences.

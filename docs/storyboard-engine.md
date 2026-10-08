# Storyboard Engine

PR 22 turns the locked Sequence Map into the first complete shot-by-shot
representation of the video.

## Inputs

The engine requires a locked Sequence Map. Every active SequenceVersion is an
exact generation input and carries its pinned Song-to-Picture provenance.

## Generation

One durable TEXT generation job produces storyboard shots for every active
sequence. The model receives exact sequence timing, purpose, source creative
state, motif/performance/camera/editing guidance, optional target shot count and
planning notes.

The returned storyboard must:

- include every active sequence exactly once;
- stay inside each sequence's timing;
- cover every sequence continuously without gaps or overlaps; and
- honor an explicit target shot count when one was set.

## Persistence

Storyboard results are materialized into the existing Shot / ShotVersion domain:

- each visual beat becomes a logical Shot;
- every generated storyboard revision becomes a ShotVersion;
- SequenceVersionShot pins exact ordered shot versions to exact sequence
  versions;
- each ShotVersion node depends on its exact source SequenceVersion node; and
- the generation job records every created shot node as an output.

The storyboard stage stores high-level visual planning fields only. PR 24 adds
the detailed reproducible generation specification.

## Regeneration

Generating a new storyboard reuses logical shots by sequence/position when
possible, creates new ShotVersions, and supersedes prior draft versions rather
than silently rewriting them.

PR 23 adds the manual storyboard editor: split, merge, reorder, duplicate,
rewrite and targeted regeneration.

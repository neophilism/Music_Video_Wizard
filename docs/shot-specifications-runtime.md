# Shot Specifications runtime

PR 28 makes the Shot Specifications stage executable.

## Immutable stage boundary

The locked Storyboard remains pinned through `SequenceVersionShot`. Shot
Specifications do **not** repoint those links.

Instead, each generated specification is stored as a later `ShotVersion` of
the same logical `Shot`, with exact provenance back to:

- the locked Storyboard `ShotVersion`;
- the locked Storyboard node;
- the locked source `SequenceVersion`;
- the locked Creative Language version; and
- the durable generation job.

This preserves the ability to revisit or audit the exact Storyboard while still
using the existing logical Shot / immutable ShotVersion domain model.

## Generation

Generation requires:

1. the Storyboard wizard step to be locked;
2. every active Storyboard ShotVersion to remain locked; and
3. Creative Language to be locked.

One durable structured-text job compiles every active Storyboard shot. The
provider must return exactly one specification per queued source ShotVersion.

## Persistence

Generated specifications become immutable-version candidates in the Shot
history. Re-running the stage supersedes only prior draft Shot Specification
versions for the same logical shot; it never rewrites the locked Storyboard.

Each specification node records:

- `COMPILED_FROM` the exact locked Storyboard shot node; and
- `REFERENCES` the exact locked Creative Language node.

The generation job records each new specification node as a
`shot-specification` output.

## Locking

The stage can lock only when every active locked Storyboard shot has a current
Shot Specification derived from the current locked Creative Language.

Locking freezes those specification versions for downstream prompt compilation
and Initial Frame generation.

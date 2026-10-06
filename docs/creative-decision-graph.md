# Creative decision graph

PR 6 turns the version-node primitives from PR 2 into an operational dependency graph.

## Why this exists

The application must be able to answer questions such as:

- If the user adopts a new visual aesthetic, which shots are affected?
- Which generated frames or clips need regeneration?
- Which timelines only need recompilation?
- Can an upstream change be adopted without rebuilding unrelated work?
- Is a proposed replacement materially identical to the pinned version?

The graph provides those answers without mutating old versions.

## Reproducibility rule

A newer creative decision does **not** make an older pinned project invalid.

Old versions remain reproducible forever. Impact analysis describes what would happen **if the user adopts a replacement version**.

That distinction is fundamental to the product.

## Dependency registration

All graph writes go through the dependency graph service.

The service:

- verifies both version nodes exist;
- rejects self-dependencies;
- rejects transitive cycles;
- serializes dependency writes with a PostgreSQL transaction-level advisory lock;
- upserts duplicate dependency declarations rather than creating ambiguous duplicates.

The advisory lock closes the concurrency race where two otherwise-valid edges could be inserted simultaneously and together form a cycle.

## Provenance

Dependency relations preserve why one version depends on another:

- `REFERENCES`
- `DERIVED_FROM`
- `GENERATED_FROM`
- `COMPILED_FROM`
- `RENDERED_FROM`

Project creation now records the immutable audio-master relationship through this service rather than writing directly to `DependencyEdge`.

Later generation and compilation milestones should do the same.

## Impact analysis

Impact traversal uses a bounded recursive PostgreSQL query.

Each affected node receives:

- dependency depth;
- exact node kind;
- upstream causes and relation types;
- a default action.

Default actions are:

| Node kind | Action |
| --- | --- |
| Project / Sequence / Shot / Creative Module | REVIEW |
| Asset | REGENERATE |
| Timeline | RECOMPILE |

These are impact classifications, not automatic destructive operations.

## Fingerprints

Structured creative data can be hashed with `fingerprintJson`.

The canonical serializer sorts object keys but preserves array order. As a result:

- semantically identical objects with different key ordering receive the same fingerprint;
- changed creative values receive a new fingerprint;
- ordered structures such as shot sequences remain order-sensitive.

When an old and replacement version have the same non-null fingerprint, replacement impact is treated as non-material and no regeneration is proposed.

## Locking

`lockVersionNode` provides one locking boundary for:

- project versions;
- sequence versions;
- shot versions;
- creative-module versions;
- timeline versions.

Locking is idempotent for an already locked version and rejects superseded versions.

Asset versions do not use semantic locking because they are immutable media records.

## What PR 6 does not do

PR 6 does not automatically replace pinned versions or launch regeneration jobs.

Those actions need the later inheritance, generation, and cascade-regeneration milestones. This PR supplies the production dependency and impact engine those features will call.

## Validation

CI runs a real PostgreSQL graph smoke test that verifies:

1. multi-edge registration;
2. transitive impact traversal;
3. REVIEW / REGENERATE / RECOMPILE classification;
4. fingerprint-based no-op replacement;
5. material replacement impact;
6. transitive cycle rejection.

This runs in addition to schema validation, migrations, type checking, linting, unit tests, the pg-boss queue smoke test, and the production build.

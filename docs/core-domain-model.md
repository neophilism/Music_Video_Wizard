# Core domain model

PR 2 establishes the persistent data model that later product capabilities must build on.

## Central rule: logical identity is separate from immutable version identity

The system distinguishes a logical object from each immutable version of that object:

- `Project` -> `ProjectVersion`
- `Sequence` -> `SequenceVersion`
- `Shot` -> `ShotVersion`
- `CreativeModule` -> `CreativeModuleVersion`
- `Asset` -> `AssetVersion`
- `Timeline` -> `TimelineVersion`

Draft versions may be edited by application logic. Once a version is locked, later changes create a new version rather than mutating the locked record.

This is required for reproducibility. If a project was created using version 2 of an aesthetic and that aesthetic later reaches version 5, the old project still points to version 2 until the user explicitly adopts the newer version.

## Project composition is version-pinned

A `ProjectVersion` pins exact `SequenceVersion` records through `ProjectVersionSequence`.

A `SequenceVersion` pins exact `ShotVersion` records through `SequenceVersionShot`.

This allows a shot or sequence to be revised without silently changing an already-locked project version.

## Creative Library bindings

Reusable creative decisions are modeled as `CreativeModule` records with immutable versions.

Examples include:

- visual aesthetics
- character definitions
- wardrobe
- locations/worlds
- cinematography grammar
- motion/performance grammar
- editing and transition grammar
- motifs
- prompt modules
- generation recipes
- typography
- output presets

`CreativeBinding` attaches one exact creative-module version to one exact versioned scope node. The `slot` identifies the purpose of the binding, such as `visual-aesthetic`, `character:lead`, or `editing-grammar`.

Later inheritance logic resolves bindings from broad scopes to narrow scopes without changing this storage model.

## Version nodes and provenance

Every immutable version receives a `DomainVersionNode`.

That common identity allows the system to store cross-domain relationships without making the product dependent on a specific generation provider or hard-coding every possible dependency pair.

`DependencyEdge` stores provenance such as:

- derived from
- references
- generated from
- compiled from
- rendered from

PR 6 will add dependency-graph services, invalidation rules, and impact analysis. PR 2 provides the persistent primitives those services operate on.

## Generated assets

`Asset` is the logical media identity. `AssetVersion` is an immutable stored representation.

This matters for:

- alternate image generations
- regenerated clips
- extended video clips
- preview renders
- final renders
- reference assets

A timeline always points to an exact asset version rather than "whatever the latest file is."

## Generation jobs

`GenerationJob` stores:

- provider-neutral job kind
- provider/model identifiers as data, not architecture
- exact request snapshot
- lifecycle state
- response metadata/error
- typed input/output version nodes

This preserves auditability while allowing provider adapters to change later.

## Timeline model

A `TimelineVersion` pins:

- the exact project version it was compiled from
- the exact immutable audio master
- an optional parent timeline version for branching

`TimelineItem` stores timing, source ranges, shot provenance, media provenance, and whether the item originated automatically or from a manual change.

The master audio is pinned to the timeline version and is not represented as an editable timeline clip. The product does not provide audio editing.

## Automatic first cut

Nothing in this schema assumes a blank editor.

The future first-cut compiler can take:

- locked project version
- locked shot versions
- approved generated assets
- exact creative bindings
- editing grammar

and create a complete `TimelineVersion` with ordered `TimelineItem` and `TimelineTransition` records.

Manual editing is a refinement layer over that compiled timeline, not the primary construction method.

## Invariants to enforce in application services

Some constraints deliberately belong in application services rather than fragile database tricks:

1. A locked version is immutable.
2. A version node's `kind` must match the table that owns it.
3. Project/sequence/shot versions may only pin logical objects belonging to the same project.
4. Creative bindings may only target scope kinds supported by the inheritance engine.
5. Audio masters referenced by project/timeline versions must be `AUDIO_MASTER` assets.
6. Timeline ranges must be non-negative and `end > start`.
7. Dependency edges must never create an invalid self-dependency.
8. Generation outputs must represent durable versioned results.
9. Recompilation must preserve valid manual overrides rather than discarding them blindly.

Those services are implemented in their dedicated PRs; the model is designed so they do not require a schema rewrite.

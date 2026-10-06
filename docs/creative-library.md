# Creative Library

PR 8 turns the versioned `CreativeModule` domain objects into a usable workspace-level library.

## What belongs in the library

A Creative Library item can represent visual aesthetics, lighting systems,
characters, wardrobe, locations/worlds, props, cinematography/composition/
motion/performance/editing/transition grammars, pacing curves, narrative
templates, motifs, reusable image/video/negative prompt modules, generation
recipes, typography kits, output presets, storyboard patterns, or another
structured creative decision.

The goal is speed without surrendering creative control: users make a decision
once and can deliberately reuse it later.

## Exact-version rule

A library item has logical identity, while each revision is a separate
`CreativeModuleVersion`.

Projects bind to an exact version. Creating version 2 never changes a project
that pinned version 1. This is the same reproducibility invariant established
by PR 7's inheritance engine.

## Draft and publish

New versions begin as `DRAFT`. Publishing locks the version so it becomes an
immutable reusable input. Further refinement creates another version.

Publishing does not automatically supersede or rewrite older versions; old
versions remain valid because existing projects may still pin them.

## Structured content

Each version can contain:

- a provider-neutral JSON definition;
- a positive prompt fragment;
- a negative prompt/exclusion fragment;
- notes;
- exact reference asset versions.

Reference assets must be READY and belong to the same workspace. They are
registered in the dependency graph, so later impact analysis and generation
provenance can trace them.

## Search and browsing

The Library UI supports text search, exact normalized tags and module-kind
filtering. The detail view exposes version history and lifecycle state.

## Deliberate boundary

PR 8 does not yet create multi-module Creative Kits. That is PR 9. It also does
not compile provider requests or generate media. Later milestones consume exact
Library versions through the provider-neutral generation boundary.

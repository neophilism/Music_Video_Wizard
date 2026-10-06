# Creative inheritance engine

PR 7 makes reusable creative decisions behave like an intentional production system rather than copied prompt text.

## Scope chain

Creative bindings resolve from broad to narrow scope:

1. project version;
2. sequence version;
3. shot version.

For a given slot, the narrowest binding wins.

A shot can therefore inherit the project's visual aesthetic, override it for one sequence, and still override a different slot such as camera motion for one shot.

## Exact version semantics

Every binding points to one exact `CreativeModuleVersion`.

Resolution never means "latest version." That preserves reproducibility and makes later impact analysis explicit: a project only changes when the user adopts another exact version.

## Provenance

Resolution returns both:

- the selected binding and the exact scope that supplied it;
- any broader bindings that were shadowed.

The UI can therefore explain why a shot received a particular decision instead of presenting an opaque merged prompt.

## Hierarchy validation

The database-backed resolver verifies that:

- the sequence belongs to the same project;
- the requested project version actually pins that exact sequence version;
- the shot belongs to the same project;
- the requested sequence version actually pins that exact shot version.

A caller cannot manufacture an inheritance chain by passing unrelated version IDs.

## Binding safety

All writes go through `setCreativeBinding` and `removeCreativeBinding`.

Those services:

- support project, sequence, and shot version scopes;
- require normalized deterministic slot names;
- only mutate DRAFT scope versions;
- reject new bindings to superseded creative-module versions;
- reject cross-workspace bindings;
- register the creative-module -> scope relationship in the dependency graph;
- remove a replaced binding dependency when it is no longer used at that scope.

This ensures PR 6 impact analysis can later trace creative decisions into generation and compilation work.

## Locked versions

Once a project, sequence, or shot version is locked, its creative bindings cannot be edited. A different choice requires a new version rather than mutation of a supposedly reproducible version.

The version-lock service also refuses to lock a directly bound scope while any directly bound creative-module version remains unlocked.

Whole-project preflight will later validate the full transitive project/sequence/shot tree before final generation and rendering.

## What is deliberately not in PR 7

PR 7 does not build the Creative Library UI, generation providers, storyboard UI, or automatic first cut.

It establishes the deterministic inheritance semantics those later systems consume.

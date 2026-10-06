# Creative Kits

PR 9 adds versioned Creative Kits on top of the Creative Library and inheritance engine.

## Purpose

A Creative Kit is a reusable collection of exact published Creative Library
versions assigned to explicit inheritance slots.

Examples include:

- a complete performance-video visual system;
- a recurring artist world with character, wardrobe, location and lighting;
- a camera + motion + editing grammar;
- a narrative template paired with pacing and motif decisions;
- a provider-neutral prompt/generation recipe bundle.

Kits accelerate setup without turning creative decisions into opaque prompt
copy.

## Exact-version semantics

Each kit version pins exact `CreativeModuleVersion` IDs. Only published
(`LOCKED`) Library versions can enter a kit.

A kit version has its own `CREATIVE_KIT` domain-version node and fingerprint.
Every member Library version registers a dependency edge into that kit version.

Creating kit v2 never changes kit v1.

## Publishing

Kit versions begin as `DRAFT`. Publishing locks the kit version. The
version-lock service refuses to lock a kit if any member Library version is
not locked.

## Application

A published kit can be applied atomically to any DRAFT project, sequence or
shot version.

Application supports two modes:

- `overwrite`: each kit slot replaces any direct binding at that target scope;
- `fill-empty`: slots that already have a direct binding at that target scope
  are left alone.

Application materializes exact ordinary creative bindings. It does **not**
create a live link from the project to the kit. This is intentional: changing
a kit later cannot silently mutate an existing project's creative
specification.

Normal project → sequence → shot inheritance then determines the effective
creative specification.

## Deliberate boundary

PR 9 provides the reusable kit model, UI and atomic application service/API.
The step-by-step project wizard that presents and applies kits arrives in the
next wizard milestones.

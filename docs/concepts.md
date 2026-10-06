# Concepts

PR 14 implements real concept development against the locked Creative Brief.

The stage is intentionally plural. It generates and preserves multiple complete
alternatives, lets the user compare them, creates new revision/combination
options without overwriting their parents, and records one explicit selected
direction for Treatment.

## Prerequisite

The current Creative Brief must be LOCKED.

Each ConceptSetVersion pins exactly one CreativeBriefVersion using a REFERENCES
dependency edge. Concept generation therefore cannot silently substitute a
different objective, audience, emotional target, form balance, imagery rule,
artist-presence decision, or constraint.

## Provider boundary

Concept generation uses the durable GenerationJob queue with kind TEXT.

The concept domain does not depend on an OpenAI request shape. The initial
adapter uses OpenAI's Responses API with strict JSON Schema structured output.
Provider and model are stored on the GenerationJob and can be replaced without
changing ConceptSet, ConceptOption, lineage, selection, or Treatment data.

Configuration:

    TEXT_GENERATION_PROVIDER=openai
    TEXT_GENERATION_MODEL=gpt-6-sol
    OPENAI_API_KEY=...

The default provider is none. In that state the project remains readable and
editable, but generation controls report that a text provider must be
configured rather than faking generated concepts.

## Concept structure

Every generated concept contains:

- title and logline;
- central premise and synopsis;
- visual world;
- narrative, performance, and abstract approaches;
- artist role;
- relationship to the song;
- emotional and musical arcs;
- distinctive images;
- recurring motifs;
- ending image;
- production logic;
- strengths;
- risks;
- a contrast statement;
- model-written brief-alignment explanations for objective, emotion, form,
  imagery, and constraints.

Brief alignment is displayed as the model's analytic assessment, not as an
objective score.

## Alternatives

Initial generation produces 2-6 deliberately distinct complete concepts.

The user can give additional direction to each batch.

Generated concepts are immutable ConceptOption records. Generating another
batch appends options; it never replaces previous work.

## Revision

A revision request chooses exactly one parent ConceptOption and provides a user
instruction.

The result is a new REVISED ConceptOption with a REVISION_SOURCE lineage edge.
The original remains intact.

## Combination

The user can compare and select 2-4 concepts, optionally give a combination
instruction, and request one coherent new concept.

The result is a COMBINED ConceptOption with ordered COMBINATION_SOURCE lineage
edges to every parent. The model is told to resolve contradictions using the
locked Creative Brief as authority rather than producing a collage.

## Selection

Selection is independent from generation.

Exactly one ConceptOption may be the selected direction on a
ConceptSetVersion. Adding or revising unselected alternatives does not
silently change the selected concept.

The wizard's downstream semantic fingerprint is based on:

- the exact source CreativeBriefVersion; and
- the exact selected concept content.

This means generating more unselected alternatives does not invalidate an
existing Treatment, while changing the selected direction does.

## Completion and locking

Concepts can be completed only when:

- one concept is explicitly selected; and
- no concept-generation job is still active.

Completion approves the selected direction for Treatment but leaves the stage
reopenable.

Locking freezes the ConceptSetVersion and the wizard stage. Treatment can then
pin that exact selected direction.

## Generation provenance

Each text job records:

- provider key;
- model key;
- complete request snapshot;
- exact Creative Brief input node;
- Concept Set node;
- progress/events;
- generated ConceptOption rows;
- GenerationOutput pointing to the Concept Set node.

Persistence is idempotent by GenerationJob ID so a worker retry cannot duplicate
concept options after a successful transaction.

## Concurrency

Concept-set mutations use optimistic revision checks.

Only one queued/running concept-generation job is allowed per ConceptSetVersion.
Locking and completion refuse while a text job is active.

## Rebase

If a newer locked Creative Brief becomes current, the Concepts UI marks the
existing set as based on an older brief. Creating a new ConceptSetVersion pins
the latest brief instead of mutating the previous set.

Concepts from an older brief are not silently carried forward because their
premises may no longer satisfy the new governing constraints.

## Validation

CI includes:

- unit validation of the concept schema;
- OpenAI response-envelope parsing tests without network access;
- real PostgreSQL Concepts workflow testing;
- the existing Music Analysis, Music Map, Creative Brief, queue, and production
  build suites.

The PostgreSQL smoke test verifies exact brief pinning, dependency provenance,
generation-output provenance, immutable generated options, selection-driven
downstream invalidation, completion/reopen, revision lineage, selection change,
locking, graph-lock compatibility, post-lock mutation rejection, fingerprinting,
and newer-brief rebase detection.

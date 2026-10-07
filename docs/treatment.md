# Treatment

PR 15 turns the locked selected concept into an editable, versioned treatment
mapped across the finished song.

## Source contract

Treatment can begin only after Concepts has a selected direction and the
Concept Set version is locked.

Each TreatmentVersion pins both:

- the exact locked ConceptSetVersion; and
- the exact selected ConceptOption inside that version.

A REFERENCES dependency edge connects the Concept Set node to the Treatment
node. If the selected direction changes later, the current Treatment is marked
as needing rebase rather than silently following the new concept.

## Drafts and generation

A new Treatment starts as an honest empty draft. The application never invents
placeholder prose.

The user may author the treatment manually or queue structured text generation.
Generation receives:

- the selected concept;
- the locked Creative Brief;
- the accepted Music Map anchors and timing;
- finished-song duration; and
- optional additional treatment direction.

The provider boundary remains swappable. The initial implementation uses the
same configured text provider introduced for Concepts.

## Treatment structure

The long-form treatment contains:

- title and thesis;
- overview;
- narrative arc;
- visual arc;
- character arc;
- performance strategy;
- world evolution;
- motif strategy;
- reveal strategy;
- ending; and
- a time-ordered song-to-picture treatment map.

Each treatment section records:

- start and end time;
- related musical-anchor labels;
- dramatic purpose;
- picture plan;
- narrative progression;
- performance plan;
- visual progression;
- character progression;
- world change;
- recurring motifs;
- major reveal; and
- transition intent.

This remains a treatment, not a shot list. Shot-level specification belongs to
later Storyboard and Shot Specifications stages.

## Versioning and locking

Treatment edits use optimistic revisions. A completed treatment can be reopened.
A locked TreatmentVersion becomes an immutable semantic input to downstream
creative-language and planning stages.

Changing treatment semantics invalidates touched downstream wizard stages
through the existing dependency/wizard review system.

## Generation provenance

Treatment generation is a durable TEXT GenerationJob. The job snapshots the
provider, model, request, source Concept Set node and Treatment node. Successful
generation creates a GenerationOutput pointing to the Treatment node and
persists the structured document idempotently.

## Validation

PR 15 adds:

- Treatment schema unit tests;
- Prisma migration validation through the existing CI database lane;
- typecheck and lint coverage;
- production build coverage; and
- the existing dependency-graph tests extended for TREATMENT.

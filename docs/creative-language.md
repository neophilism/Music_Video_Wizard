# Creative Language

PR 16 creates the reusable project-wide visual and editorial grammar that sits
between the locked Treatment and the later song-to-picture/storyboard stages.

## Source contract

Creative Language can begin only after Treatment is locked.

Each CreativeLanguageVersion pins one exact TreatmentVersion and registers a
REFERENCES dependency edge from that Treatment node. A newer locked Treatment
does not silently rewrite an existing Creative Language version; the UI marks
the older language as needing rebase.

## What the document governs

The structured document records:

- governing visual idea;
- visual aesthetic;
- color system;
- materials and texture;
- lighting grammar;
- composition grammar;
- cinematography grammar;
- camera-motion grammar;
- subject-motion grammar;
- performance grammar;
- editing grammar;
- transition grammar;
- pacing curve;
- world rules;
- continuity rules;
- typography and graphics;
- recurring characters;
- locations/worlds;
- wardrobe;
- motifs and props;
- positive provider-neutral generation language;
- negative generation language; and
- hard exclusions.

These are reusable rules. They are deliberately not individual shots or shot
timings.

## Generation

A new Creative Language version begins as an honest empty draft.

The user may author it manually or generate a structured first pass from the
locked Treatment. Generation uses the existing provider-neutral text boundary.
The provider/model/request and exact Treatment input are preserved through the
durable GenerationJob provenance model.

## Completion and locking

Drafts use optimistic revisions.

Completion requires a substantive grammar, including at least three positive
generation rules and at least one hard exclusion.

A completed version can be reopened until it is locked. Once locked, the
CreativeLanguageVersion becomes an immutable semantic input for song-to-picture
planning, storyboard, shot specifications and later generation.

Material changes mark already-touched downstream wizard stages NEEDS_REVIEW.

## Creative Library relationship

Creative Language is a first-class project artifact rather than merely a live
Creative Kit or collection of Library modules.

The existing Creative Library and Creative Kits remain reusable building
blocks. Later integration can deliberately attach exact published module
versions to this project language without making external library changes
silently mutate the project's locked grammar.

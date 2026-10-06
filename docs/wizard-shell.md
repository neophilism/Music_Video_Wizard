# Wizard Shell

PR 10 establishes the persistent workflow shell for the Music Video Wizard.

It does not fabricate music analysis, concepts, storyboard frames, generated
clips, or an edit before those real engines exist. Instead, it supplies the
durable workflow infrastructure every later stage uses.

## Workflow

The shell registers these ordered stages:

1. Project setup
2. Music analysis
3. Music map
4. Creative brief
5. Concepts
6. Treatment
7. Creative language
8. Song-to-picture plan
9. Storyboard
10. Shot specifications
11. Initial frames
12. Video clips
13. Automatic first cut
14. Refinement
15. Finish & export

The finished song remains the immutable master. Audio editing is outside the
wizard.

## Persistent resume state

Each ProjectVersion owns one WizardProgress record. It stores the current step,
a monotonic content/status revision, and one WizardStepState for every
registered stage.

Opening an existing project resumes the saved wizard rather than reconstructing
progress from browser state.

## Autosave

Editable stage payloads are stored durably in WizardStepState with:

- canonical payload fingerprint;
- content revision;
- last-saved timestamp;
- optimistic project-wizard revision.

Concurrent stale writes return HTTP 409 instead of silently overwriting a newer
tab/session.

PR 10 makes Project Setup the first real autosaving editor. Its saved title,
description, aspect ratio, output dimensions, and frame rate are synchronized
with the actual Project and ProjectVersion records in the same transaction.

## Completion and locking

A step may be in NOT_STARTED, IN_PROGRESS, COMPLETED, or NEEDS_REVIEW state.

Completion is separate from locking. A completed step can be reopened and
changed. A locked step cannot be changed within that ProjectVersion.

This preserves reproducibility while allowing ordinary backtracking before a
decision is locked.

## Backtracking and impact warnings

When upstream content changes or a completed upstream stage is explicitly
reopened, any downstream stage that already contains work is marked
NEEDS_REVIEW.

Locked downstream content is not mutated or unlocked. The warning explicitly
notes that its content remains preserved.

This shell-level impact mechanism complements the domain dependency graph:
wizard workflow state handles human review obligations while the dependency
graph handles versioned data/media provenance and regeneration impact.

## Real stage boundary

Stages whose domain engines are implemented by later PRs are visible in the
shell so the workflow is stable from the start, but PR 10 does not present fake
outputs for them. Their status/navigation records already exist and their real
editors can attach to the shell without schema redesign.

## Automatic first cut

The workflow explicitly places the complete automatic first cut after approved
shot specifications, initial frames, and generated clips. The later first-cut
compiler will consume those already-made creative decisions to assemble the
initial edit automatically, after which refinement can retime or replace clips
and change transitions.

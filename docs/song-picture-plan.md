# Song-to-Picture Plan

PR 17 maps the locked Treatment and locked Creative Language continuously across
the exact approved Music Map before individual shots are designed.

## Exact source pinning

Every SongPicturePlanVersion pins three immutable semantic inputs:

- one locked TreatmentVersion;
- one locked CreativeLanguageVersion derived from that Treatment; and
- the exact locked MusicMapVersion that ultimately underlies that Treatment.

The plan registers REFERENCES edges from all three source nodes. A later change
to any source cannot silently alter an existing plan.

## Visual passages, not shots

The plan is made of timed visual passages. Each passage records:

- exact start/end time;
- one or more Treatment section indexes it serves;
- accepted Music Map anchor IDs;
- dramatic purpose;
- picture state;
- narrative state;
- character state;
- performance mode;
- world state;
- motif state;
- Creative Language application;
- camera/motion intent;
- editing rhythm;
- transition intent; and
- visual intensity.

The plan must cover the entire finished master contiguously from 0 to the exact
song duration.

It deliberately does not specify individual storyboard frames, lenses, image
prompts or video prompts. Those belong to later Storyboard and Shot
Specifications stages.

## Generation and manual editing

A plan starts as an honest empty draft. It can be authored manually or generated
through the existing provider-neutral structured-text boundary.

Generation receives only the three pinned locked sources plus optional user
direction. It may organize them into timed passages but may not alter the song,
Treatment story, or Creative Language rules.

## Validation and locking

Completion rejects:

- gaps or overlaps;
- a plan that does not begin at 0;
- a plan that does not end exactly at the master duration;
- invalid Treatment section references; and
- Music Map anchor IDs that are not accepted in the pinned map.

Completed plans can be reopened until locked. A locked SongPicturePlanVersion
becomes an immutable semantic source for Storyboard and downstream planning.

# Video Clips runtime

PR 34 makes the Video Clips stage executable from locked Initial Frames and locked Shot Specifications.

## Exact source pair

A current Video Clip is identified by two immutable source versions:

1. the exact locked Shot Specification version;
2. the exact Initial Frame AssetVersion generated for that specification.

If either source changes, an older clip remains historical but is no longer current.

## Compilation and provider selection

Each target shot is compiled into a provider-neutral VIDEO request with an explicit `FIRST_FRAME` requirement.

Capability-driven selection chooses a configured image-to-video provider/model that can satisfy:

- first-frame control;
- project aspect ratio;
- requested generated duration;
- other compiled capability requirements.

A provider minimum duration does not disqualify a shorter edit: the system may over-generate and trim later. A request above a provider maximum is rejected.

## Durable provider tasks

One durable VIDEO GenerationJob is queued per shot.

When the provider returns an asynchronous task ID, the worker persists that ID to the GenerationJob before polling. If polling later fails transiently and the durable job retries, the worker resumes the existing provider task instead of paying for a second submission.

## First-frame delivery

The worker resolves the exact Initial Frame through AssetStorage.

HTTPS-backed storage uses a signed HTTPS URL. Local/non-HTTPS storage is materialized and passed as a base64 data URI, within the provider's inline-size limit.

This keeps the provider integration compatible with both local development and private production storage.

## Output persistence

Successful provider output is never treated as durable at the provider URL.

The worker immediately downloads the generated video and writes it through AssetStorage, then creates a versioned `GENERATED_VIDEO` asset with:

- SHA-256 fingerprint;
- exact Shot Specification source;
- exact Initial Frame AssetVersion source;
- Storyboard source;
- GenerationJob;
- provider and model;
- editorial and generated duration metadata.

Regeneration creates a later AssetVersion on the same logical video asset.

## Dependency graph

Each Video Clip AssetVersion node has `GENERATED_FROM` edges from both:

- the Shot Specification node;
- the Initial Frame AssetVersion node.

The GenerationJob records the same two nodes as durable inputs and the clip node as its `video-clip` output.

## Completion and locking

Video Clips completes automatically only when every locked Initial Frame / Shot Specification source pair has a current clip.

The complete set can then be locked as the source boundary for the Automatic First Cut.

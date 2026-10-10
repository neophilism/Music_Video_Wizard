# Runway video-generation adapter

PR 32 adds Runway as the first executable video-generation provider behind the provider-neutral media boundary.

## Current models

The adapter exposes two image-to-video choices:

- `gen4.5` — quality-oriented default;
- `gen4_turbo` — faster alternate.

Model choice remains data. The product domain and Video Clips stage do not depend on Runway SDK types.

## First-frame contract

Video generation consumes a resolved provider-neutral `FIRST_FRAME` reference. The reference may be a signed URL or data URI.

The compiled generation request still owns timing, aspect ratio, motion, performance, continuity, and exclusions. The adapter only translates that request plus the approved first frame into Runway's API payload.

## Duration

Runway's Gen-4.5 currently generates between 2 and 10 seconds. A requested edit shorter than the provider minimum is still compatible: the adapter requests the provider minimum and downstream assembly trims to the exact editorial duration.

Requests longer than the model maximum remain incompatible and must select another capable model/provider or fail explicitly.

## Aspect ratios

Gen-4.5 exposes the current Runway image-to-video aspect ratios through the capability descriptor. The adapter translates project ratios into Runway resolution-form ratio values.

Gen-4 Turbo is exposed conservatively for 16:9 and 9:16.

## Asynchronous task flow

Submission creates a Runway image-to-video task and stores its task ID as the external job ID.

Polling uses the Runway task endpoint and maps provider states into the internal media-generation states:

- PENDING -> QUEUED;
- non-terminal processing -> RUNNING;
- SUCCEEDED -> remote MP4 output;
- FAILED -> failed result with provider diagnostics;
- CANCELED -> canceled result.

Runway output URLs are temporary. The Video Clips persistence layer must download successful output immediately and store it through the application's own AssetStorage abstraction instead of exposing the provider URL as a durable product asset.

## Configuration

Set:

- `VIDEO_GENERATION_PROVIDER=runway`;
- `RUNWAY_API_SECRET`;
- optionally `RUNWAY_BASE_URL`;
- optionally `RUNWAY_API_VERSION`.

The default API version header is `2024-11-06`.

## Gen-4 Turbo duration precision

The Gen-4 Turbo API supports only 5- and 10-second generations. The capability descriptor therefore advertises a 5-second minimum. Requested clips with an editorial duration shorter than five seconds are generated at five seconds and trimmed downstream; requests above five but no more than ten generate ten seconds. Gen-4.5 retains its 2–10 second duration capability. These paid API request durations are independent of the immutable exact editorial timeline length.

# Finish & Export render manifest

PR 40 establishes the deterministic validation and render-manifest boundary for final delivery.

## Locked source

Finish & Export becomes available only after Refinement is locked.

The manifest pins:

- exact locked Working TimelineVersion and node;
- exact immutable audio-master AssetVersion and node;
- exact Video Clip AssetVersion and node for every timeline item;
- exact source trims and editorial timing;
- transition records;
- ProjectVersion delivery dimensions, aspect ratio, and frame rate.

## Validation before render cost

Manifest preparation rejects the project before any render job is queued when:

- output dimensions are invalid or incompatible with yuv420p;
- frame rate is invalid;
- the audio master is not a valid audio asset;
- any timeline item is missing video media;
- the timeline has gaps or overlaps;
- source ranges do not exactly match editorial durations;
- a source trim exceeds the clip duration;
- transitions do not connect adjacent items uniquely;
- a transition exceeds adjacent editorial duration;
- a non-zero transition lacks enough outgoing clip tail;
- known audio duration differs materially from the timeline duration.

A one-frame-or-50-ms tolerance is allowed for ordinary container-duration rounding.

## Reproducible output contract

The initial master manifest specifies:

- MP4 container;
- H.264 video;
- AAC audio;
- yuv420p pixel format;
- exact project dimensions;
- exact project frame rate.

The manifest also records total duration and expected frame count.

## Provider-duration correction

PR 40 also corrects generated-video metadata: asynchronous provider submissions may round requested duration to provider-supported increments. The Video Clip worker now reads the submitted provider request snapshot and persists the actual generated duration rather than only the requested duration.

This matters for reliable transition-tail validation and later source trimming.

## Wizard behavior

Preparing the manifest saves it as managed Finish & Export state and fingerprints the complete render source contract.

If locked Refinement media or delivery settings change, the current manifest fingerprint no longer matches and the stage requires preparation again.

## Next boundary

PR 41 will use this manifest to queue a durable `RENDER` job, materialize media into an isolated workspace, invoke FFmpeg, verify the output, store a versioned render asset, and preserve exact render provenance.

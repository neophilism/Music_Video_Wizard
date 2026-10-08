# Initial Frames runtime

PR 30 makes the Initial Frames stage executable behind the wizard UI.

## Sources

Every generated frame is tied to one exact locked Shot Specification version. The runtime refuses generation unless:

- the Shot Specifications wizard stage is locked;
- every active Storyboard shot resolves to a locked current Shot Specification;
- project aspect ratio and frame rate are available;
- at least one configured image-generation model satisfies the compiled request.

The source Shot Specification node is recorded as the durable generation input.

## Compilation and provider selection

Each shot is compiled independently into a provider-neutral IMAGE request. Provider/model selection is capability-driven using the PR 25/26 compiler and selection layers.

The selected provider and model are snapshotted onto the durable GenerationJob before execution.

## Durable generation

One IMAGE job is queued per requested shot. Empty `shotSpecificationVersionIds` means the entire current locked specification set. Passing a subset supports targeted regeneration.

The worker:

1. revalidates the exact locked source version;
2. invokes the selected media adapter;
3. supports both immediate and pollable provider results;
4. hashes and stores the resulting image bytes;
5. persists the result as a versioned `GENERATED_IMAGE` asset;
6. creates a dependency edge from Shot Specification node to AssetVersion node;
7. records the asset node as the durable `initial-frame` generation output.

## Asset versioning

Initial frames are logical assets keyed to the logical Shot, not disposable files.

Regenerating a frame creates a later AssetVersion on the same logical image asset. Each version records the exact source Shot Specification version, Storyboard source version, GenerationJob, provider, and model in metadata.

A frame generated from an older Shot Specification is never treated as current after the specification changes.

## Completion and locking

The Initial Frames step completes automatically only when every current locked Shot Specification has a current frame AssetVersion.

The stage can then be locked. Locking freezes the selected current frame set as the source boundary for Video Clips.

## Storage

Provider output is normalized into bytes and written through the existing AssetStorage abstraction, so local development storage and S3-compatible production storage use the same runtime.

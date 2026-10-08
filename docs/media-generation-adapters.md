# Media generation adapters and capability selection

PR 26 defines the boundary between the Music Video Wizard and external image/video generation providers.

## Product rule

The product owns the creative specification and compiled generation request. Providers are execution adapters.

Vendor SDK request/response shapes must not appear above the adapter boundary.

## Model descriptors

Each configured provider exposes model descriptors containing:

- provider ID and model ID;
- enabled state and deterministic priority;
- text-to-image support;
- image-editing support;
- image-to-video support;
- reference-image support;
- first-frame and optional last-frame support;
- supported duration bounds;
- supported aspect ratios and resolutions.

## Selection

Selection is capability-driven and deterministic.

A model is eligible only if every required capability, duration, and aspect ratio in the compiled request is satisfied. Among eligible models, the lowest numeric priority wins, with provider/model identifiers used only as deterministic tie-breakers.

If no model qualifies, the system fails explicitly and reports why candidates were rejected. It must never weaken the locked creative request merely to fit a provider.

## Adapter contract

Adapters expose four operations:

1. list configured model capabilities;
2. submit a compiled request;
3. poll an asynchronous generation job;
4. cancel when supported.

Submissions and results preserve provider/model provenance plus immutable provider request/response snapshots for reproducibility and audit.

# OpenAI image-generation adapter

PR 27 adds the first executable image-generation provider behind the provider-neutral media adapter boundary.

## Provider

The adapter uses OpenAI's Images API generation endpoint and exposes two currently supported GPT Image 2.5 models:

- `gpt-image-2.5-sunburst` as the quality-oriented default;
- `gpt-image-2.5-flare` as the faster alternate.

The provider remains replaceable. No OpenAI request object escapes the adapter boundary.

## Synchronous result handling

The Images API returns completed image bytes directly rather than a pollable asynchronous job. The media adapter contract therefore supports an immediate result in addition to an external job ID.

The result carries the generated image as base64 plus its content type. A later orchestration layer is responsible for writing those bytes into the application's versioned asset storage and recording the resulting AssetVersion.

## Prompt and exclusions

The provider receives the compiled positive prompt plus explicit hard exclusions. Provider-specific payload construction happens only inside this adapter.

## Sizing

GPT Image 2.5 accepts arbitrary dimensions within its documented limits. The adapter derives a divisible-by-16 size from the project's W:H aspect ratio, using a 1536-pixel long edge for non-square initial frames.

## Failure semantics

Transient network failures, HTTP 408/409/429 responses, and server failures remain retryable. Other 4xx responses are treated as permanent provider errors so the durable job layer can fail explicitly rather than retrying invalid requests forever.

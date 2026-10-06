# Generation provider strategy

The product owns the creative specification. External media models are replaceable execution providers.

No project, concept, shot, creative module, storyboard, generation recipe, or timeline may depend on a provider-specific SDK shape.

## Adapter boundary

Later generation milestones will expose internal provider contracts for image and video work.

At minimum the contracts must describe capabilities such as:

- text-to-image;
- image editing;
- reference-image support;
- image-to-video from an approved first frame;
- optional last-frame/keyframe support;
- reference-image/video support;
- supported durations;
- supported aspect ratios and resolutions;
- deterministic request snapshots and provider/model provenance;
- asynchronous status polling;
- cancellation when the upstream API supports it.

Provider and model identifiers remain data on `GenerationJob`, not product architecture.

## Text generation

Creative-planning text generation uses the same adapter principle.

The initial text adapter uses OpenAI's Responses API with strict structured output. The configured model is data on the durable GenerationJob; the default configuration introduced with concept development is `gpt-6-sol`, but the ConceptSet / ConceptOption domain never depends on that model or on an OpenAI response shape.

Concept generation is disabled explicitly when no text provider is configured. The application must never substitute fake concept output.

## Initial image provider: OpenAI

The initial image adapter will use the OpenAI API.

The initial quality-oriented default is `gpt-image-2.5-sunburst`, with `gpt-image-2.5-flare` available as a faster draft option where product UX benefits from it.

The adapter must support both generation and editing/reference workflows without exposing OpenAI request objects above the provider boundary.

## Initial video provider: Runway

The initial video adapter will use Runway.

The first ordinary image-to-video model target is `gen4.5`, because the product's primary video-generation path starts from a user-approved initial frame and needs controlled shot duration and multiple music-video aspect ratios.

Runway is still an adapter, not a permanent dependency. The capability layer must permit another Runway model or another provider when a shot requires capabilities the default model does not supply, such as longer generation, additional reference controls, or keyframe behavior.

## Why OpenAI is not the initial video provider

As of October 2026, OpenAI's Sora 2 models and Videos API have been removed from the public API without a replacement video endpoint. The architecture therefore must not assume that image and video generation come from the same provider.

## Selection rule

Provider/model selection should be capability-driven:

1. compile the approved shot specification;
2. determine required generation capabilities;
3. select a configured provider/model that satisfies them;
4. persist provider, model, request snapshot, and outputs;
5. fail explicitly if no configured provider satisfies the shot rather than silently degrading the creative specification.

The user may later change preferred providers or models globally or per generation recipe without changing the core project model.

# Prompt Compiler

PR 25 introduces the provider-neutral Prompt Compiler.

The compiler converts an approved, versioned Shot Specification into a deterministic internal generation request. It does not select a vendor and it does not emit OpenAI, Runway, or any other provider's API payload.

## Contract

Every compiled request records:

- exact source Shot Specification version;
- exact source Storyboard Shot version;
- target media kind;
- editorial duration and generated duration including transition handles;
- aspect ratio and frame rate;
- positive generation instructions;
- explicit negative constraints;
- reference-asset requirements;
- capability requirements used later for provider/model selection;
- a deterministic request-fingerprint input snapshot.

Provider and model identifiers are intentionally absent from the compiler output.

## Duration

Shot Specifications may request conservative generation handles. The compiler adds the handle on both sides of the editorial duration so downstream editing can preserve transitions without silently shortening the approved shot.

## Capability handoff

The next provider-selection layer chooses a configured adapter/model whose declared capabilities satisfy the compiled request. If no provider satisfies the request, generation must fail explicitly rather than weaken the creative specification.

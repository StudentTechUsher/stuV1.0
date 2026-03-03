# ADR 0001: CreateV3 Runtime Stack

## Status
Accepted (2026-02-26)

## Context
`/grad-plan/createV2` evolved around mixed orchestration patterns and opaque loading behavior. For createV3, we need a cleaner architecture where guided UX decisions, agent context, runtime execution, and observability are explicit and auditable.

## Decision
For createV3, use a custom orchestration runtime with OpenAI APIs and framework-agnostic boundaries:
- `ContextStore` for canonical event ledger + snapshot projection
- `WorkflowRunner` for durable phase execution
- `ModelClient` for model invocation and routing

Also adopt hybrid model routing:
- high-context model for `major_skeleton` and `verify_heuristics`
- lightweight model for deterministic fill phases

## Rejected Alternatives
1. Mastra runtime in createV3 path
Reason: createV3 requires tighter control over event ledger contracts and reduced framework coupling during redesign.

2. Vercel AI SDK dependency in createV3 path
Reason: we want direct control over lifecycle instrumentation and phase routing while contracts stabilize.

## Consequences
- Positive:
  - clearer boundaries between UI contracts and backend runtime
  - deterministic skill pipeline can be tested independently
  - deep trace instrumentation without hidden framework behavior
- Tradeoff:
  - we maintain more orchestration code ourselves
  - we must enforce consistency with explicit interfaces and tests

## Rollout Notes
- createV3 remains internal beta behind feature flags.
- createV2 remains default and operational.
- createV3 stack can be swapped later because boundary interfaces isolate runtime dependencies.

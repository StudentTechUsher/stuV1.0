---
name: grad-plan-v3-heuristics
description: Use this skill when implementing or debugging graduation-plan createV3 heuristic logic, especially remaining-requirements diffing, term credit envelopes, repair-loop triage, and trace-first observability workflows.
---

# Grad Plan V3 Heuristics

## When to use
- The task touches `createV3` planning heuristics or validation failures.
- The user reports poor generation quality, duplicate planned courses, or transcript-completed course leakage.
- You need to reason about repair loops or phase-level model routing.
- You need to debug createV3 behavior using redacted trace events.

## Workflow
1. Read the canonical snapshot and event contracts in `lib/chatbot/grad-plan/v3/types.ts`.
2. Recompute remaining credits using requirement bucket diff, then verify `totalCreditsToComplete`.
3. Run deterministic checks before any model/prompt changes:
   - duplicate planned course codes
   - transcript-completed course leakage
   - missing requirement bucket coverage
   - per-term credit envelope violations
4. If checks fail, generate targeted repair hints by phase instead of broad reruns.
5. Validate the trace timeline includes phase, skill, and validation checkpoints with redacted payloads.

## Repair triage rules
- Duplicate courses: rerun `major_fill` or `minor_fill` for conflicting buckets.
- Completed-course leakage: rerun `gen_ed_fill`/`major_fill` excluding completed course set.
- Missing buckets: rerun the specific fill phase by bucket type.
- Credit envelope violations: rerun `elective_fill` with load rebalance constraints.
- Stop after two repair loops; return a structured failure payload if still invalid.

## Observability checklist
- Confirm a context event exists for each user decision and generation phase transition.
- Confirm each trace event is redacted and preserves metadata fields (`hash`, `length`, `classification`) for sensitive text.
- Confirm SSE ordering and `Last-Event-ID` resume behavior for trace replay.

## Additional references
- `references/heuristics.md` for deterministic rule details and expected outcomes.

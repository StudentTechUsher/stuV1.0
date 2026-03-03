# Grad Plan CreateV3

## Route
- `app/(dashboard)/grad-plan/createV3/page.tsx`
- Feature-gated internal beta route.

## Feature Flags
- `GRAD_PLAN_V3_ENABLED`
- `NEXT_PUBLIC_GRAD_PLAN_V3_ENABLED`
- `GRAD_PLAN_V3_DEVTOOLS_ENABLED`
- `NEXT_PUBLIC_GRAD_PLAN_V3_DEVTOOLS_ENABLED`

If either v3 route flag is false, `/grad-plan/createV3` redirects to `/grad-plan/createV2`.

## Contracts
Core v3 contracts are defined in:
- `lib/chatbot/grad-plan/v3/types.ts`
- `lib/chatbot/grad-plan/v3/reducer.ts`

Canonical state is modeled as:
- append-only `ContextEvent` ledger
- reducer-projected `AgentContextSnapshot`

## APIs
- `POST /api/grad-plan/v3/sessions`
- `GET /api/grad-plan/v3/sessions/:sessionId`
- `POST /api/grad-plan/v3/sessions/:sessionId/events`
- `GET /api/grad-plan/v3/sessions/:sessionId/events`
- `GET /api/grad-plan/v3/sessions/:sessionId/trace`
- `GET /api/grad-plan/v3/sessions/:sessionId/trace/events` (SSE)

## Persistence
Database migration:
- `supabase/migrations/20260226131000_add_grad_plan_v3_context_ledger.sql`

Tables:
- `grad_plan_v3_sessions`
- `grad_plan_v3_context_events`
- `grad_plan_v3_trace_events`

## Storybook
New component namespace:
- `components/grad-plan/v3/*`

Primary shell story:
- `components/grad-plan/v3/CreateV3Shell.stories.tsx`

Includes happy path, edge states, mobile viewport, and interaction test for context updates.

## Codex Skill
Repo-managed skill:
- `codex-skills/grad-plan-v3-heuristics`

Install/sync into local Codex home:
```bash
tools/codex/install-skill.sh
```

This script runs `quick_validate.py` from the `skill-creator` system skill when available.

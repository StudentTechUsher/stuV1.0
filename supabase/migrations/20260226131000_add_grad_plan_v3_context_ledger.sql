CREATE TABLE IF NOT EXISTS public.grad_plan_v3_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'canceled')),
  schema_version integer NOT NULL DEFAULT 1,
  snapshot_json jsonb NOT NULL,
  last_event_id bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grad_plan_v3_sessions_user_conversation_key UNIQUE (user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS public.grad_plan_v3_context_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.grad_plan_v3_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  event_type text NOT NULL CHECK (
    event_type IN (
      'profile_confirmed',
      'transcript_choice_set',
      'programs_selected',
      'course_selection_submitted',
      'distribution_selected',
      'constraints_selected',
      'generation_mode_selected',
      'generation_phase_updated',
      'generation_completed',
      'generation_failed',
      'generation_canceled'
    )
  ),
  actor text NOT NULL DEFAULT 'user' CHECK (actor IN ('user', 'agent', 'system')),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  ts timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grad_plan_v3_context_events_session_event_unique UNIQUE (session_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.grad_plan_v3_trace_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.grad_plan_v3_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trace_id text NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN ('ui_action', 'context_event', 'phase', 'skill', 'model', 'validation', 'repair', 'system')
  ),
  phase text CHECK (
    phase IN (
      'queued',
      'preparing',
      'major_skeleton',
      'major_fill',
      'minor_fill',
      'gen_ed_fill',
      'elective_fill',
      'verify_heuristics',
      'persisting',
      'completed',
      'failed',
      'canceled'
    )
  ),
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  payload_json jsonb,
  redacted boolean NOT NULL DEFAULT true,
  ts timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grad_plan_v3_trace_events_session_trace_unique UNIQUE (session_id, trace_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grad_plan_v3_context_events_idempotency
  ON public.grad_plan_v3_context_events(session_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_sessions_user_updated
  ON public.grad_plan_v3_sessions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_context_events_session_id
  ON public.grad_plan_v3_context_events(session_id, id);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_context_events_session_ts
  ON public.grad_plan_v3_context_events(session_id, ts);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_trace_events_session_id
  ON public.grad_plan_v3_trace_events(session_id, id);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_trace_events_session_ts
  ON public.grad_plan_v3_trace_events(session_id, ts);

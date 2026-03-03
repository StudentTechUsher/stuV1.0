-- Ensure base v3 ledger tables exist before adding generation runtime tables.
-- Some environments may apply this migration without the earlier v3 context migration.
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
      'mini_chat_message_added',
      'generation_command_requested',
      'generation_command_applied',
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

CREATE TABLE IF NOT EXISTS public.grad_plan_v3_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.grad_plan_v3_sessions(id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'queued',
      'in_progress',
      'pause_requested',
      'paused',
      'cancel_requested',
      'canceled',
      'completed',
      'failed'
    )
  ),
  phase text NOT NULL DEFAULT 'queued' CHECK (
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
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  input_payload jsonb NOT NULL,
  draft_plan jsonb,
  output_access_id text,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz,
  attempt integer NOT NULL DEFAULT 0,
  repair_loop_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grad_plan_v3_generation_job_events (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.grad_plan_v3_generation_jobs(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (
    event_type IN (
      'job_created',
      'job_started',
      'phase_started',
      'phase_completed',
      'job_progress',
      'command_requested',
      'command_applied',
      'job_paused',
      'job_resumed',
      'job_canceled',
      'job_completed',
      'job_failed'
    )
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
  message text,
  progress_percent integer CHECK (progress_percent >= 0 AND progress_percent <= 100),
  payload_json jsonb
);

CREATE TABLE IF NOT EXISTS public.grad_plan_v3_generation_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.grad_plan_v3_generation_jobs(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.grad_plan_v3_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  command_type text NOT NULL CHECK (command_type IN ('pause', 'resume', 'cancel', 'retry', 'reply')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  payload_json jsonb,
  idempotency_key text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  applied_phase text CHECK (
    applied_phase IN (
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
  response_message text
);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_jobs_status_created
  ON public.grad_plan_v3_generation_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_jobs_session_created
  ON public.grad_plan_v3_generation_jobs(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_jobs_user_created
  ON public.grad_plan_v3_generation_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_job_events_job_id_id
  ON public.grad_plan_v3_generation_job_events(job_id, id);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_job_events_job_id_ts
  ON public.grad_plan_v3_generation_job_events(job_id, ts);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_commands_job_requested
  ON public.grad_plan_v3_generation_commands(job_id, requested_at);

CREATE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_commands_job_status
  ON public.grad_plan_v3_generation_commands(job_id, status, requested_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_jobs_active_unique
  ON public.grad_plan_v3_generation_jobs(user_id, session_id)
  WHERE status IN ('queued', 'in_progress', 'pause_requested', 'paused', 'cancel_requested');

CREATE UNIQUE INDEX IF NOT EXISTS idx_grad_plan_v3_generation_commands_idempotency
  ON public.grad_plan_v3_generation_commands(job_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.grad_plan_v3_context_events
  DROP CONSTRAINT IF EXISTS grad_plan_v3_context_events_event_type_check;

ALTER TABLE public.grad_plan_v3_context_events
  ADD CONSTRAINT grad_plan_v3_context_events_event_type_check
  CHECK (
    event_type IN (
      'profile_confirmed',
      'transcript_choice_set',
      'programs_selected',
      'course_selection_submitted',
      'distribution_selected',
      'constraints_selected',
      'mini_chat_message_added',
      'generation_command_requested',
      'generation_command_applied',
      'generation_mode_selected',
      'generation_phase_updated',
      'generation_completed',
      'generation_failed',
      'generation_canceled'
    )
  );

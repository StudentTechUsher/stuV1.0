CREATE TABLE IF NOT EXISTS public.grad_plan_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'cancel_requested', 'canceled')),
  phase text NOT NULL DEFAULT 'queued' CHECK (phase IN ('queued', 'preparing', 'major_skeleton', 'gen_ed_fill', 'elective_balance', 'persisting', 'completed', 'failed', 'canceled')),
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  input_payload jsonb NOT NULL,
  output_access_id text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz,
  attempt integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grad_plan_generation_job_events (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.grad_plan_generation_jobs(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN ('job_created', 'job_started', 'phase_started', 'phase_completed', 'job_progress', 'job_completed', 'job_failed', 'job_canceled')),
  phase text CHECK (phase IN ('queued', 'preparing', 'major_skeleton', 'gen_ed_fill', 'elective_balance', 'persisting', 'completed', 'failed', 'canceled')),
  message text,
  progress_percent integer CHECK (progress_percent >= 0 AND progress_percent <= 100),
  payload_json jsonb
);

CREATE INDEX IF NOT EXISTS idx_grad_plan_generation_jobs_status_created_at
  ON public.grad_plan_generation_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grad_plan_generation_jobs_user_created_at
  ON public.grad_plan_generation_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grad_plan_generation_job_events_job_id_id
  ON public.grad_plan_generation_job_events(job_id, id);

CREATE INDEX IF NOT EXISTS idx_grad_plan_generation_job_events_job_id_ts
  ON public.grad_plan_generation_job_events(job_id, ts);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grad_plan_generation_jobs_active_unique
  ON public.grad_plan_generation_jobs(user_id, conversation_id)
  WHERE status IN ('queued', 'in_progress');

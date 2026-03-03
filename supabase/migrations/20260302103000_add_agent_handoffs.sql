CREATE TABLE IF NOT EXISTS public.agent_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bootstrap_payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_expires_at
  ON public.agent_handoffs (expires_at);

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_user_created_at
  ON public.agent_handoffs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_used_expires
  ON public.agent_handoffs (used_at, expires_at);

ALTER TABLE public.agent_handoffs ENABLE ROW LEVEL SECURITY;

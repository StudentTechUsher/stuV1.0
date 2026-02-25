ALTER TABLE public.grad_plan_generation_jobs
  DROP CONSTRAINT IF EXISTS grad_plan_generation_jobs_phase_check;

ALTER TABLE public.grad_plan_generation_jobs
  ADD CONSTRAINT grad_plan_generation_jobs_phase_check
  CHECK (
    phase IN (
      'queued',
      'preparing',
      'major_skeleton',
      'major_fill',
      'minor_fill',
      'gen_ed_fill',
      'elective_balance',
      'elective_fill',
      'verify_heuristics',
      'persisting',
      'completed',
      'failed',
      'canceled'
    )
  );

ALTER TABLE public.grad_plan_generation_job_events
  DROP CONSTRAINT IF EXISTS grad_plan_generation_job_events_phase_check;

ALTER TABLE public.grad_plan_generation_job_events
  ADD CONSTRAINT grad_plan_generation_job_events_phase_check
  CHECK (
    phase IN (
      'queued',
      'preparing',
      'major_skeleton',
      'major_fill',
      'minor_fill',
      'gen_ed_fill',
      'elective_balance',
      'elective_fill',
      'verify_heuristics',
      'persisting',
      'completed',
      'failed',
      'canceled'
    )
  );

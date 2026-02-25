ALTER TABLE public.student_schedules
ADD COLUMN IF NOT EXISTS course_selections jsonb NOT NULL DEFAULT '[]'::jsonb;

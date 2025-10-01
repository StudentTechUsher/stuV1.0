-- Migration: Add institution_settings table with selection mode
-- Created: 2025-10-01
-- Purpose: Allow admins to configure how students select classes during plan creation

-- Create institution_settings table
CREATE TABLE IF NOT EXISTS public.institution_settings (
  university_id INTEGER PRIMARY KEY REFERENCES public.university(id) ON DELETE CASCADE,
  selection_mode TEXT NOT NULL DEFAULT 'MANUAL', -- 'AUTO' | 'MANUAL' | 'CHOICE'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

-- Read policy: members of the institution can read
CREATE POLICY "read settings - same institution"
ON public.institution_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.university_id = institution_settings.university_id
  )
);

-- Write policy: only admins of that institution (role_id = 1 is assumed admin; adjust if different)
-- Assuming role_id=1 is admin. If different, adjust the role_id check accordingly.
CREATE POLICY "write settings - admin only"
ON public.institution_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.university_id = institution_settings.university_id
      AND p.role_id = 1 -- admin role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.university_id = institution_settings.university_id
      AND p.role_id = 1 -- admin role
  )
);

-- Seed default MANUAL mode for each existing institution
INSERT INTO public.institution_settings (university_id, selection_mode)
SELECT id, 'MANUAL' FROM public.university
ON CONFLICT (university_id) DO NOTHING;

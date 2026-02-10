-- Migration: Backfill user_roles from existing profiles.role_id
-- Phase 1d: Migrate existing role data to new canonical table

-- =============================================================================
-- Backfill user_roles from profiles.role_id
-- =============================================================================
-- Mapping:
--   role_id 1 = university_admin
--   role_id 2 = advisor
--   role_id 3 = student
--   role_id 4 = super_admin

INSERT INTO public.user_roles (user_id, role, university_id, granted_at)
SELECT
  p.id AS user_id,
  CASE p.role_id
    WHEN 1 THEN 'university_admin'
    WHEN 2 THEN 'advisor'
    WHEN 3 THEN 'student'
    WHEN 4 THEN 'super_admin'
    ELSE NULL
  END AS role,
  p.university_id,
  p.created_at AS granted_at
FROM public.profiles p
WHERE p.role_id IS NOT NULL
  AND p.role_id IN (1, 2, 3, 4)
ON CONFLICT (user_id, role) DO NOTHING;

-- =============================================================================
-- Backfill advisor_programs from existing advisors.programs array
-- =============================================================================
-- Migrate the programs array from advisors table to the new advisor_programs table

INSERT INTO public.advisor_programs (advisor_id, program_id, granted_at)
SELECT
  a.profile_id AS advisor_id,
  unnest(a.programs) AS program_id,
  a.created_at AS granted_at
FROM public.advisors a
WHERE a.programs IS NOT NULL
  AND array_length(a.programs, 1) > 0
  AND a.profile_id IS NOT NULL
ON CONFLICT (advisor_id, program_id) DO NOTHING;

-- =============================================================================
-- Log migration results
-- =============================================================================
DO $$
DECLARE
  roles_count INTEGER;
  advisor_programs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_count FROM public.user_roles;
  SELECT COUNT(*) INTO advisor_programs_count FROM public.advisor_programs;

  RAISE NOTICE 'Backfill complete: % user roles, % advisor-program relationships',
    roles_count, advisor_programs_count;
END $$;

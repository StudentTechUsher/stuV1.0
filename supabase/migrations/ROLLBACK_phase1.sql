-- ============================================================================
-- ROLLBACK SCRIPT: Phase 1 Auth Hardening
-- ============================================================================
-- This script completely removes all Phase 1 changes
-- Safe to run - restores database to pre-Phase-1 state
-- ============================================================================

-- Step 1: Remove trigger from profiles table
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();

-- Step 2: Remove new helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS public.has_role(TEXT);
DROP FUNCTION IF EXISTS public.is_advisor_of_student(UUID);
DROP FUNCTION IF EXISTS public.is_university_admin_of(BIGINT);
DROP FUNCTION IF EXISTS public.get_user_university_id();

-- Step 3: Restore original is_advisor() function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_advisor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Original implementation (checks profiles.role_id = 2)
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role_id = 2
  );
END;
$$;

COMMENT ON FUNCTION public.is_advisor() IS 'Check if current user has the advisor role (checks profiles.role_id)';
GRANT EXECUTE ON FUNCTION public.is_advisor() TO authenticated;

-- Step 4: Drop new auth tables (in reverse dependency order)
-- ============================================================================
DROP TABLE IF EXISTS public.advisor_requests CASCADE;
DROP TABLE IF EXISTS public.advisor_programs CASCADE;
DROP TABLE IF EXISTS public.advisor_students CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ============================================================================
-- Verification Queries (run these after rollback to confirm success)
-- ============================================================================

-- Should return 0 rows (tables removed)
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('user_roles', 'advisor_students', 'advisor_programs', 'advisor_requests');

-- Should return 0 rows (trigger removed)
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE trigger_name = 'trigger_protect_profile_privileged_columns';

-- Should return 1 row: is_advisor (others removed)
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('is_advisor', 'has_role', 'is_advisor_of_student', 'is_university_admin_of', 'get_user_university_id');

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

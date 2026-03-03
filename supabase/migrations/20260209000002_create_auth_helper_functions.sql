-- Migration: Create Authorization Helper Functions
-- Phase 1c: Reusable RLS helper functions

-- =============================================================================
-- 1. has_role: Check if current user has a specific role
-- =============================================================================
CREATE OR REPLACE FUNCTION public.has_role(check_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = check_role
  );
END;
$$;

COMMENT ON FUNCTION public.has_role(TEXT) IS 'Check if the current authenticated user has the specified role';

-- =============================================================================
-- 2. is_advisor_of_student: Check if current user is advisor of a given student
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_advisor_of_student(check_student_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Direct advisor-student relationship
  IF EXISTS (
    SELECT 1
    FROM public.advisor_students
    WHERE advisor_id = auth.uid()
      AND student_id = check_student_profile_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Advisor has access via program relationship
  -- Check if advisor has any programs that match the student's programs
  IF EXISTS (
    SELECT 1
    FROM public.advisor_programs ap
    INNER JOIN public.student s ON s.profile_id = check_student_profile_id
    WHERE ap.advisor_id = auth.uid()
      AND ap.program_id = ANY(s.selected_programs)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_advisor_of_student(UUID) IS 'Check if current user is an advisor of the specified student (via direct grant or program relationship)';

-- =============================================================================
-- 3. is_university_admin_of: Check if current user is university admin of a given university
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_university_admin_of(check_university_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('university_admin', 'super_admin')
      AND (
        role = 'super_admin' OR
        university_id = check_university_id
      )
  );
END;
$$;

COMMENT ON FUNCTION public.is_university_admin_of(BIGINT) IS 'Check if current user is a university admin of the specified university (or super admin)';

-- =============================================================================
-- 4. Fix existing is_advisor function to use new user_roles table
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_advisor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.has_role('advisor');
END;
$$;

COMMENT ON FUNCTION public.is_advisor() IS 'Check if current user has the advisor role (uses user_roles table)';

-- =============================================================================
-- 5. get_user_university_id: Get the university ID for the current user
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_university_id()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result_university_id BIGINT;
BEGIN
  SELECT university_id INTO result_university_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN result_university_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_university_id() IS 'Get the university_id for the current authenticated user from their profile';

-- =============================================================================
-- Grant execute permissions to authenticated users
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_advisor_of_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_university_admin_of(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_advisor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_university_id() TO authenticated;

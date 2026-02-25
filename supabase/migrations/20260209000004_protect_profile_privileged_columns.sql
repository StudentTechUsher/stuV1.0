-- Migration: Protect Privileged Columns on profiles table
-- Phase 1e: Add trigger to prevent client-side modification of sensitive fields

-- =============================================================================
-- Create trigger function to protect privileged columns
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only apply protection if caller is NOT service_role
  -- service_role can update these fields (for admin operations)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Silently revert protected fields to their OLD values
  -- This prevents clients from modifying these sensitive fields
  NEW.role_id := OLD.role_id;
  NEW.university_id := OLD.university_id;
  NEW.onboarded := OLD.onboarded;
  NEW.authorization_agreed := OLD.authorization_agreed;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_profile_privileged_columns() IS 'Trigger function that prevents client-side modification of role_id, university_id, onboarded, and authorization_agreed';

-- =============================================================================
-- Attach trigger to profiles table
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_protect_profile_privileged_columns ON public.profiles;

CREATE TRIGGER trigger_protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

COMMENT ON TRIGGER trigger_protect_profile_privileged_columns ON public.profiles IS 'Prevents non-service_role updates to privileged columns (role_id, university_id, onboarded, authorization_agreed)';

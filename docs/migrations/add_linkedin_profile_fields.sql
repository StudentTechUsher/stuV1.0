-- Migration: Add LinkedIn Profile Fields to Profiles Table
-- Created: 2025-10-16
-- Description: Adds columns to store LinkedIn profile PDF URL and upload timestamp

-- Add LinkedIn profile columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add column comments for documentation
COMMENT ON COLUMN profiles.linkedin_profile_url IS 'URL to the uploaded LinkedIn profile PDF in Supabase Storage (student-documents bucket)';
COMMENT ON COLUMN profiles.linkedin_profile_uploaded_at IS 'Timestamp when the LinkedIn profile PDF was last uploaded';

-- Verify the columns were added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'linkedin_profile_url'
  ) THEN
    RAISE NOTICE 'Column linkedin_profile_url successfully added to profiles table';
  ELSE
    RAISE EXCEPTION 'Failed to add column linkedin_profile_url to profiles table';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'linkedin_profile_uploaded_at'
  ) THEN
    RAISE NOTICE 'Column linkedin_profile_uploaded_at successfully added to profiles table';
  ELSE
    RAISE EXCEPTION 'Failed to add column linkedin_profile_uploaded_at to profiles table';
  END IF;
END $$;

-- Note: Run the Supabase Storage policies separately from the Supabase dashboard
-- or via the Supabase CLI. See LINKEDIN_PROFILE_FEATURE.md for the policy SQL.

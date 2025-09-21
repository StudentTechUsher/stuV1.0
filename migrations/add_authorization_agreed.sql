-- Add authorization_agreed column to profiles table
-- Run this in your Supabase SQL editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS authorization_agreed BOOLEAN DEFAULT FALSE;

-- Add a comment to the column
COMMENT ON COLUMN public.profiles.authorization_agreed IS 'Whether user has agreed to academic data access authorization';

-- Add timestamp for when they agreed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS authorization_agreed_at TIMESTAMPTZ;

-- Add a comment to the timestamp column
COMMENT ON COLUMN public.profiles.authorization_agreed_at IS 'Timestamp when user agreed to authorization';
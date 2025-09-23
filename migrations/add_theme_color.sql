-- Add theme_color column to profiles table
-- Run this in your Supabase SQL editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#12F987';

-- Add a comment to the column
COMMENT ON COLUMN public.profiles.theme_color IS 'User customizable theme color in hex format';

-- Optionally, add a check constraint to validate hex color format
ALTER TABLE public.profiles
ADD CONSTRAINT theme_color_format
CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9A-Fa-f]{6}$');
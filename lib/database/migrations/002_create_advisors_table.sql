-- Migration: Create advisors table
-- Description: Stores advisor information with organizational scope
-- Author: Claude Code
-- Date: 2025-10-08

-- Create advisors table
CREATE TABLE IF NOT EXISTS advisors (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic information
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,

  -- Organizational scope
  scope TEXT NOT NULL CHECK (scope IN ('UNIVERSITY', 'COLLEGE', 'DEPARTMENT', 'MAJOR')),
  college_id TEXT,
  department_id TEXT,
  major_id TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advisors_profile_id ON advisors(profile_id);
CREATE INDEX IF NOT EXISTS idx_advisors_email ON advisors(email);
CREATE INDEX IF NOT EXISTS idx_advisors_scope ON advisors(scope);
CREATE INDEX IF NOT EXISTS idx_advisors_college_id ON advisors(college_id) WHERE college_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advisors_department_id ON advisors(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_advisors_major_id ON advisors(major_id) WHERE major_id IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_advisors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_advisors_updated_at
  BEFORE UPDATE ON advisors
  FOR EACH ROW
  EXECUTE FUNCTION update_advisors_updated_at();

-- Enable Row Level Security
ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Advisors can view their own record
CREATE POLICY "Advisors can view own record"
  ON advisors FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Admins can view all advisors
CREATE POLICY "Admins can view all advisors"
  ON advisors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Admins can manage advisors
CREATE POLICY "Admins can manage advisors"
  ON advisors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Add helpful comments
COMMENT ON TABLE advisors IS 'Stores advisor information with organizational scope for withdrawal tracking';
COMMENT ON COLUMN advisors.scope IS 'Organizational scope: UNIVERSITY, COLLEGE, DEPARTMENT, or MAJOR';
COMMENT ON COLUMN advisors.college_id IS 'College ID if scope is COLLEGE or below';
COMMENT ON COLUMN advisors.department_id IS 'Department ID if scope is DEPARTMENT or below';
COMMENT ON COLUMN advisors.major_id IS 'Major ID if scope is MAJOR';

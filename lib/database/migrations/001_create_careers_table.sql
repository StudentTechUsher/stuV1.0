-- Migration: Create careers table
-- Description: Stores career information for the pathfinder feature
-- Author: Claude Code
-- Date: 2025-10-08

-- Create careers table
CREATE TABLE IF NOT EXISTS careers (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT UNIQUE NOT NULL,

  -- Basic information
  title TEXT NOT NULL,
  short_overview TEXT NOT NULL,
  overview TEXT NOT NULL,

  -- Education requirements
  education_level TEXT NOT NULL CHECK (education_level IN ('BACHELOR', 'MASTER', 'PHD', 'VARIES')),
  certifications TEXT[], -- Array of certification names

  -- Major recommendations (stored as JSONB array)
  best_majors JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{"id": "maj_cs", "name": "Computer Science"}]

  -- Location data
  location_hubs TEXT[] NOT NULL DEFAULT '{}', -- Array of location strings

  -- Salary information (stored as JSONB)
  salary_usd JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"entry": 55000, "median": 75000, "p90": 110000, "source": "BLS 2024"}

  -- Career outlook (stored as JSONB)
  outlook JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"growthLabel": "Hot", "notes": "...", "source": "BLS"}

  -- Skills and daily activities
  top_skills TEXT[] NOT NULL DEFAULT '{}',
  day_to_day TEXT[] NOT NULL DEFAULT '{}',

  -- Educational resources
  recommended_courses TEXT[],
  internships TEXT[],
  clubs TEXT[],

  -- Related content
  related_careers TEXT[], -- Array of career slugs
  links JSONB DEFAULT '[]'::jsonb, -- [{"label": "BLS", "url": "..."}]

  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  published_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_id TEXT, -- References profiles table
  updated_by_name TEXT,
  updated_by_role TEXT CHECK (updated_by_role IN ('ADVISOR', 'ADMIN', 'STU'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_careers_slug ON careers(slug);
CREATE INDEX IF NOT EXISTS idx_careers_status ON careers(status);
CREATE INDEX IF NOT EXISTS idx_careers_published_at ON careers(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_careers_title_search ON careers USING gin(to_tsvector('english', title || ' ' || overview));
CREATE INDEX IF NOT EXISTS idx_careers_skills_search ON careers USING gin(top_skills);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_careers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_careers_updated_at
  BEFORE UPDATE ON careers
  FOR EACH ROW
  EXECUTE FUNCTION update_careers_updated_at();

-- Enable Row Level Security
ALTER TABLE careers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can read published careers
CREATE POLICY "Public can view published careers"
  ON careers FOR SELECT
  TO authenticated, anon
  USING (status = 'published');

-- Advisors and admins can view all careers
CREATE POLICY "Advisors can view all careers"
  ON careers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADVISOR', 'ADMIN')
    )
  );

-- Advisors and admins can insert/update careers
CREATE POLICY "Advisors can manage careers"
  ON careers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADVISOR', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADVISOR', 'ADMIN')
    )
  );

-- Add helpful comments
COMMENT ON TABLE careers IS 'Stores career information for the pathfinder feature';
COMMENT ON COLUMN careers.slug IS 'URL-friendly identifier (e.g., "data-analyst")';
COMMENT ON COLUMN careers.best_majors IS 'JSONB array of recommended majors: [{"id": "maj_cs", "name": "Computer Science"}]';
COMMENT ON COLUMN careers.salary_usd IS 'JSONB object with salary data: {"entry": 55000, "median": 75000, "p90": 110000, "source": "BLS 2024"}';
COMMENT ON COLUMN careers.outlook IS 'JSONB object with career outlook: {"growthLabel": "Hot", "notes": "...", "source": "BLS"}';

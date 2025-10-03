-- Add graduation timeline and career goals fields to profiles table

-- Add estimated graduation semester (e.g., "Fall 2026")
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS est_grad_sem TEXT;

-- Add estimated graduation date
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS est_grad_date DATE;

-- Add career goals (free text, max 1000 chars enforced at app level)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS career_goals TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.est_grad_sem IS 'Estimated graduation semester in format "Fall 2026"';
COMMENT ON COLUMN profiles.est_grad_date IS 'Estimated graduation date';
COMMENT ON COLUMN profiles.career_goals IS 'Student career goals and aspirations (free text)';

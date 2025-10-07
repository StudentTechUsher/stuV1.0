-- Add plan_name column to grad_plan table
-- This allows students to give custom names to their graduation plans

ALTER TABLE grad_plan
ADD COLUMN plan_name TEXT;

-- Set default names for existing plans based on creation date
UPDATE grad_plan
SET plan_name = 'Graduation Plan ' || TO_CHAR(created_at, 'YYYY-MM-DD')
WHERE plan_name IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN grad_plan.plan_name IS 'Custom name for the graduation plan, set by the student';

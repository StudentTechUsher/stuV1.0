-- Migration: Create withdrawals and related tables
-- Description: Stores student withdrawal data and email digest outbox
-- Author: Claude Code
-- Date: 2025-10-08

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Student and course references
  student_id TEXT NOT NULL, -- References student table
  course_id TEXT NOT NULL,

  -- Action details
  action TEXT NOT NULL CHECK (action IN ('ENROLL', 'WITHDRAW')),
  action_at TIMESTAMPTZ NOT NULL,
  reason TEXT,

  -- Course deadline context
  add_drop_deadline TIMESTAMPTZ,
  days_after_deadline INTEGER, -- Calculated: days between action_at and deadline

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create withdrawal_outbox table for email digests
CREATE TABLE IF NOT EXISTS withdrawal_outbox (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Advisor reference
  advisor_id TEXT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,

  -- Digest data (stored as JSONB for flexibility)
  digest_data JSONB NOT NULL, -- Contains withdrawal summary and student list

  -- Email status
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Digest period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_student_id ON withdrawals(student_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_course_id ON withdrawals(course_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_action ON withdrawals(action);
CREATE INDEX IF NOT EXISTS idx_withdrawals_action_at ON withdrawals(action_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_action_at_action ON withdrawals(action_at, action);

-- Create indexes for withdrawal_outbox
CREATE INDEX IF NOT EXISTS idx_withdrawal_outbox_advisor_id ON withdrawal_outbox(advisor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_outbox_sent ON withdrawal_outbox(sent) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_withdrawal_outbox_period ON withdrawal_outbox(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_withdrawal_outbox_created_at ON withdrawal_outbox(created_at);

-- Create updated_at trigger for outbox
CREATE OR REPLACE FUNCTION update_withdrawal_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_withdrawal_outbox_updated_at
  BEFORE UPDATE ON withdrawal_outbox
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawal_outbox_updated_at();

-- Create function to calculate days after deadline
CREATE OR REPLACE FUNCTION calculate_days_after_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.add_drop_deadline IS NOT NULL THEN
    NEW.days_after_deadline := EXTRACT(DAY FROM (NEW.action_at - NEW.add_drop_deadline));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_days_after_deadline
  BEFORE INSERT OR UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_days_after_deadline();

-- Enable Row Level Security
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_outbox ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawals
-- Advisors can view withdrawals within their scope
CREATE POLICY "Advisors can view withdrawals in scope"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM advisors a
      JOIN student s ON s.id = withdrawals.student_id
      WHERE a.profile_id = auth.uid()
      AND (
        a.scope = 'UNIVERSITY'
        OR (a.scope = 'COLLEGE' AND a.college_id = s.college_id)
        OR (a.scope = 'DEPARTMENT' AND a.department_id = s.department_id)
        OR (a.scope = 'MAJOR' AND a.major_id = s.major_id)
      )
    )
  );

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- RLS Policies for withdrawal_outbox
-- Advisors can view their own outbox
CREATE POLICY "Advisors can view own outbox"
  ON withdrawal_outbox FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM advisors
      WHERE advisors.id = withdrawal_outbox.advisor_id
      AND advisors.profile_id = auth.uid()
    )
  );

-- System/cron jobs can manage outbox (service role)
CREATE POLICY "Service role can manage outbox"
  ON withdrawal_outbox FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE withdrawals IS 'Stores student enrollment actions (enrollments and withdrawals)';
COMMENT ON TABLE withdrawal_outbox IS 'Email digest outbox for weekly withdrawal notifications';
COMMENT ON COLUMN withdrawals.days_after_deadline IS 'Auto-calculated: days between action and add/drop deadline';
COMMENT ON COLUMN withdrawal_outbox.digest_data IS 'JSONB containing withdrawal summary and student details for email';
COMMENT ON COLUMN withdrawal_outbox.sent IS 'Whether the digest email has been sent';

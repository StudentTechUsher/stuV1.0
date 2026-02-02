-- Migration: Create student scheduling system (simplified JSONB design)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create student_schedules table with JSONB fields
CREATE TABLE student_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  grad_plan_id UUID REFERENCES grad_plan(id) ON DELETE SET NULL,
  term_name TEXT NOT NULL,
  term_index INTEGER,

  blocked_times JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT false,

  UNIQUE(student_id, grad_plan_id, term_name),
  CHECK(term_name IS NOT NULL AND term_name != '')
);

CREATE INDEX idx_student_schedules_student ON student_schedules(student_id);
CREATE INDEX idx_student_schedules_grad_plan ON student_schedules(grad_plan_id);
CREATE INDEX idx_student_schedules_active ON student_schedules(student_id, is_active) WHERE is_active = true;
CREATE INDEX idx_student_schedules_blocked_times ON student_schedules USING GIN (blocked_times);
CREATE INDEX idx_student_schedules_preferences ON student_schedules USING GIN (preferences);

-- Create schedule_course_selections table
CREATE TABLE schedule_course_selections (
  selection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES student_schedules(schedule_id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  requirement_type TEXT,
  primary_offering_id INTEGER REFERENCES course_offerings(offering_id) ON DELETE SET NULL,
  backup_1_offering_id INTEGER REFERENCES course_offerings(offering_id) ON DELETE SET NULL,
  backup_2_offering_id INTEGER REFERENCES course_offerings(offering_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'registered', 'waitlisted', 'dropped')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(schedule_id, course_code),
  CHECK(primary_offering_id IS NOT NULL OR course_code IS NOT NULL)
);

CREATE INDEX idx_course_selections_schedule ON schedule_course_selections(schedule_id);
CREATE INDEX idx_course_selections_course_code ON schedule_course_selections(course_code);
CREATE INDEX idx_course_selections_primary_offering ON schedule_course_selections(primary_offering_id);

-- Create trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_schedules_updated_at
  BEFORE UPDATE ON student_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_selections_updated_at
  BEFORE UPDATE ON schedule_course_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

// Types for the graduation plan and four-year planner components

import type { ProgramRow } from './program';

// 1..N are semester terms

export type Course = {
  id: string;
  code: string;
  title: string;
  credits: number;        // allow decimals (e.g., 1.5)
  requirement: string;    // e.g., "Junior Core", "Business Core", etc.
  semester: number;       // 1..N
  prerequisite?: string;  // course prerequisites
  meta?: Record<string, unknown>;
};

export type SemesterMeta = {
  notes?: string[];
  checkpoints?: { action: string; conditions?: string[]; notes?: string }[];
};

export type PlanCheckpoint = {
  term?: string;           // "Semester 4"
  action: string;
  conditions?: string[];
  notes?: string;
};

export type PlanCourse = {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];     // e.g., ["Junior Core"]
  requirement?: string;    // optional single string
  [k: string]: unknown;
};

export type PlanTerm = {
  term: string;            // e.g., "Semester 1"
  courses: PlanCourse[];
  notes?: string | string[];
  [k: string]: unknown;
};

export type GraduationPlan = {
  program?: string;
  duration_years?: number;
  assumptions?: string[];
  checkpoints?: PlanCheckpoint[];
  plan: PlanTerm[];
  terms_planned?: number;   // how many terms the student plans on
  [k: string]: unknown;
};

export type ChipTheme = { 
  base: string; 
  text: string; 
};

export type Semester = {
  id: number;
  label: string;
};

export type GradPlannerProps = {
  plan?: GraduationPlan;
  fetchPlan?: () => Promise<GraduationPlan>;
  programsData?: ProgramRow[];
  genEdData?: ProgramRow[];
  studentProfile?: {
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  };
};

/**
 * Program Progress Types
 * Used for tracking student progress across Major, Minor, GE, Religion, and Electives
 */

export type ProgressCategory = 'MAJOR' | 'MINOR' | 'GE' | 'RELIGION' | 'ELECTIVES';
export type CourseStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED' | 'ELIGIBLE' | 'NOT_APPLICABLE';

export interface CourseRef {
  id: string;
  code: string;
  title: string;
  credits: number;
  term?: string;
  status: CourseStatus;
  note?: string;
  source?: 'TRANSCRIPT' | 'PLAN' | 'ADVISOR_OVERRIDE';
}

export interface SubRequirement {
  id: string;
  title: string;
  description?: string;
  minCredits?: number;
  minCount?: number;
  courses: CourseRef[];
  appliedCourseIds: string[];
  progress: number; // 0..1
  status: 'SATISFIED' | 'PARTIAL' | 'UNSATISFIED' | 'WAIVED' | 'SUBSTITUTED';
  advisorNote?: string;
}

export interface Requirement {
  id: string;
  index: number;
  title: string;
  subtitle?: string;
  progress: number; // 0..1
  fraction?: { num: number; den: number; unit?: 'hrs' | 'courses' };
  status: 'SATISFIED' | 'PARTIAL' | 'UNSATISFIED' | 'WAIVED' | 'SUBSTITUTED';
  subrequirements?: SubRequirement[];
}

export interface CategoryProgress {
  category: ProgressCategory;
  label: string;
  requiredHours?: number;
  overallPercent: number; // 0..100
  kpis: {
    completed: number;
    inProgress: number;
    planned: number;
    remaining: number;
  };
  requirements: Requirement[];
}

export interface ProgramProgressPayload {
  studentId: string;
  planId?: string;
  categories: CategoryProgress[];
  lastUpdatedISO: string;
}

export interface AdvisorAction {
  type: 'APPROVE' | 'WAIVE' | 'SUBSTITUTE' | 'NOTE';
  requirementId: string;
  note?: string;
  fromCourseId?: string;
  toCourseId?: string;
}

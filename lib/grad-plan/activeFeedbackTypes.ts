import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

export interface DraftCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  source?: 'selected' | 'elective';
}

export interface DraftTerm {
  id: string;
  label: string;
  minCredits: number;
  maxCredits: number;
  targetCredits?: number;
  courses: DraftCourse[];
}

export interface DraftPlan {
  terms: DraftTerm[];
}

export interface DraftPlanInput {
  courseData: unknown;
  suggestedDistribution?: SemesterAllocation[];
  hasTranscript?: boolean;
  academicTerms?: AcademicTermsConfig;
}

export type PlanEdit =
  | {
      type: 'move_course';
      courseId: string;
      direction: 'earlier' | 'later';
    };

export interface PlanUpdate {
  plan: DraftPlan;
  changes: string[];
  explanations?: string[];
  alternatives?: string[];
}

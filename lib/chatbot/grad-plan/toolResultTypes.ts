/**
 * Typed tool result registry for graduation plan pipeline
 *
 * This file defines typed input/output shapes for every tool in the pipeline,
 * replacing the `result as SomeType` casts scattered through handleToolComplete.
 */

import type { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import type { ProgramSelectionInput } from '@/lib/chatbot/tools/programSelectionTool';
import type { CourseSelectionInput } from '@/lib/chatbot/tools/courseSelectionTool';
import type { TranscriptCheckInput } from '@/lib/chatbot/tools/transcriptCheckTool';
import type { CreditDistributionStrategy, Milestone } from './types';
import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';
import type { ProgramRow } from '@/types/program';

// ============================================================================
// Tool Result Types (what each tool returns on completion)
// ============================================================================

export interface ProfileCheckResult {
  completed: boolean;
}

export interface TranscriptCheckResult {
  hasTranscript: boolean;
  wantsToUpload: boolean;
  wantsToUpdate?: boolean;
}

export interface StudentTypeResult {
  studentType: 'undergraduate' | 'honor' | 'graduate';
}

export interface CareerSuggestionsResult {
  selectedCareer: string;
}

export interface ProgramSuggestionsResult {
  programName: string;
  programType: string;
}

export interface MilestonesAndConstraintsResult {
  milestones: Milestone[];
  workConstraints: {
    workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable';
    additionalNotes: string;
  };
}

export interface GeneratePlanConfirmationResult {
  action: 'generate' | 'review';
  mode?: 'automatic' | 'active_feedback';
  startTerm?: string;
  startYear?: number;
}

export interface ActiveFeedbackPlanResult {
  action: 'generate' | 'close';
  draftPlan?: unknown;
}

export interface ProfileUpdateResult {
  est_grad_date?: string | null;
  est_grad_sem?: string | null;
  career_goals?: string | null;
  admission_year?: number | null;
  is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
}

export interface MilestoneResult {
  milestones: Milestone[];
}

export interface AdditionalConcernsResult {
  hasAdditionalConcerns: boolean;
  workStatus?: 'not_working' | 'part_time' | 'full_time' | 'variable';
  additionalNotes?: string;
}

// Pathfinder tools - conversation in progress (no structured result)
export interface CareerPathfinderResult {
  inProgress: true;
}

export interface ProgramPathfinderResult {
  inProgress: true;
}

// ============================================================================
// Tool Result Map - Maps each ToolType to its typed result shape
// ============================================================================

export interface ToolResultMap {
  profile_check: ProfileCheckResult;
  profile_update: ProfileUpdateResult;
  transcript_check: TranscriptCheckResult;
  student_type: StudentTypeResult;
  career_pathfinder: CareerPathfinderResult;
  program_pathfinder: ProgramPathfinderResult;
  program_selection: ProgramSelectionInput;
  course_selection: CourseSelectionInput;
  credit_distribution: CreditDistributionStrategy;
  milestones: MilestoneResult;
  milestones_and_constraints: MilestonesAndConstraintsResult;
  additional_concerns: AdditionalConcernsResult;
  career_suggestions: CareerSuggestionsResult;
  program_suggestions: ProgramSuggestionsResult[];
  generate_plan_confirmation: GeneratePlanConfirmationResult;
  active_feedback_plan: ActiveFeedbackPlanResult;
}

// Helper type to get result for a specific tool
export type ToolResultFor<T extends ToolType> = ToolResultMap[T];

// ============================================================================
// Tool Data Types (what each tool needs to render)
// ============================================================================

export interface ProfileCheckToolData {
  userId: string;
  hasActivePlan?: boolean;
}

export interface ProfileUpdateToolData {
  currentValues?: {
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
    admission_year?: number | null;
    is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
    selected_gen_ed_program_id?: number | null;
  };
  universityId?: number;
  hasActivePlan?: boolean;
}

export interface TranscriptCheckToolData {
  hasCourses: boolean;
  academicTerms: AcademicTermsConfig;
}

export interface StudentTypeToolData {
  // No specific data needed - just renders form
}

export interface ProgramSelectionToolData {
  studentType: 'undergraduate' | 'honor' | 'graduate';
  universityId: number;
  admissionYear?: number | null;
  isTransfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
  genEdProgramId?: number | null;
  profileId?: string;
  suggestedPrograms?: Array<{ programName: string; programType: string }>;
}

export interface CourseSelectionToolData {
  studentType: 'undergraduate' | 'honor' | 'graduate';
  universityId: number;
  selectedProgramIds: number[];
  genEdProgramIds?: number[];
  userId?: string;
  hasTranscript: boolean;
  mockMode?: boolean;
  mockProgramsData?: ProgramRow[];
  mockGenEdData?: ProgramRow[];
  mockTranscriptCourses?: Array<{ code: string; title: string; credits: number }>;
}

export interface CreditDistributionToolData {
  totalCredits: number;
  studentData: {
    admission_year: number;
    admission_term: string;
    est_grad_date: string;
  };
  hasTranscript?: boolean;
  academicTerms: AcademicTermsConfig;
}

export interface MilestonesToolData {
  // No specific data needed - just renders form
}

export interface MilestonesAndConstraintsToolData {
  distribution?: SemesterAllocation[];
  studentType?: 'undergraduate' | 'honor' | 'graduate';
}

export interface AdditionalConcernsToolData {
  context?: string;
}

export interface CareerSuggestionsToolData {
  interests?: string;
  careerGoals?: string;
  suggestions: {
    careers: Array<{
      title: string;
      description: string;
      matchScore: number;
    }>;
  };
}

export interface ProgramSuggestionsToolData {
  career?: string;
  interests?: string;
  suggestions: {
    programs: Array<{
      name: string;
      type: string;
      description: string;
      matchScore: number;
    }>;
  };
}

export interface GeneratePlanConfirmationToolData {
  academicTerms?: AcademicTermsConfig;
  lastCompletedTerm?: string | null;
  preferredStartTerms?: string[];
}

export interface ActiveFeedbackPlanToolData {
  courseData?: unknown;
  distribution?: unknown;
  suggestedDistribution?: SemesterAllocation[];
  hasTranscript?: boolean;
  academicTermsConfig?: AcademicTermsConfig;
  workStatus?: string;
  milestones?: Array<{
    id?: string;
    type?: string;
    title?: string;
    timing?: string;
    term?: string;
    year?: number;
  }>;
}

export interface CareerPathfinderToolData {
  // Conversation in progress - no structured data
}

export interface ProgramPathfinderToolData {
  // Conversation in progress - no structured data
}

// ============================================================================
// Tool Data Map - Maps each ToolType to its toolData shape
// ============================================================================

export interface ToolDataMap {
  profile_check: ProfileCheckToolData;
  profile_update: ProfileUpdateToolData;
  transcript_check: TranscriptCheckToolData;
  student_type: StudentTypeToolData;
  career_pathfinder: CareerPathfinderToolData;
  program_pathfinder: ProgramPathfinderToolData;
  program_selection: ProgramSelectionToolData;
  course_selection: CourseSelectionToolData;
  credit_distribution: CreditDistributionToolData;
  milestones: MilestonesToolData;
  milestones_and_constraints: MilestonesAndConstraintsToolData;
  additional_concerns: AdditionalConcernsToolData;
  career_suggestions: CareerSuggestionsToolData;
  program_suggestions: ProgramSuggestionsToolData;
  generate_plan_confirmation: GeneratePlanConfirmationToolData;
  active_feedback_plan: ActiveFeedbackPlanToolData;
}

// Helper type to get toolData for a specific tool
export type ToolDataFor<T extends ToolType> = ToolDataMap[T];

/**
 * Mock Data Generators for Grad Plan Pipeline Testing
 *
 * Factory functions that generate valid typed tool results and state data
 * for testing the full pipeline without hitting real APIs or databases.
 */

import type { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import type { ToolResultFor } from './toolResultTypes';
import {
  ConversationStep,
  type ConversationState,
  type StudentType,
  type ProgramSelection,
  type CourseSelection,
  type CreditDistributionStrategy,
  type Milestone,
} from './types';
import { createInitialState, updateState } from './stateManager';
import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

// ============================================================================
// Mock Context Data
// ============================================================================

export function createMockStudentProfile(overrides?: Partial<{
  id: string;
  university_id: number;
  student_type: StudentType | null;
  est_grad_date: string | null;
  admission_year: number | null;
  is_transfer: 'freshman' | 'transfer' | 'dual_enrollment' | null;
}>) {
  return {
    id: 'mock-user-123',
    university_id: 1,
    student_type: 'undergraduate' as const,
    est_grad_date: '2027-05-15',
    admission_year: 2023,
    is_transfer: null,
    ...overrides,
  };
}

export function createMockAcademicTerms(): AcademicTermsConfig {
  return {
    terms: {
      primary: [
        { id: 'fall', label: 'Fall' },
        { id: 'spring', label: 'Spring' },
      ],
      secondary: [
        { id: 'summer', label: 'Summer' },
      ],
    },
    system: 'semester_with_terms',
    ordering: ['fall', 'spring', 'summer'],
    academic_year_start: 'fall',
  };
}

// ============================================================================
// Per-Tool Mock Results
// ============================================================================

export function createMockProfileCheckResult(): ToolResultFor<'profile_check'> {
  return {
    completed: true,
  };
}

export function createMockTranscriptCheckResult(hasTranscript = true): ToolResultFor<'transcript_check'> {
  return {
    hasTranscript,
    wantsToUpload: !hasTranscript,
    wantsToUpdate: false,
  };
}

export function createMockStudentTypeResult(studentType: StudentType = 'undergraduate'): ToolResultFor<'student_type'> {
  return {
    studentType,
  };
}

export function createMockProgramSelectionResult(studentType: StudentType = 'undergraduate'): ToolResultFor<'program_selection'> {
  if (studentType === 'graduate') {
    return {
      studentType: 'graduate',
      programs: {
        graduateProgramIds: ['101'],
      },
    };
  }

  return {
    studentType,
    programs: {
      majorIds: ['42', '43'],
      minorIds: ['75'],
      genEdIds: ['1'],
      honorsProgramIds: studentType === 'honor' ? ['99'] : undefined,
    },
  };
}

export function createMockCourseSelectionResult(): ToolResultFor<'course_selection'> {
  return {
    selectionMode: 'manual',
    programs: [
      {
        programId: '42',
        programName: 'Computer Science',
        programType: 'major',
        requirements: [
          {
            requirementId: 'cs-core-1',
            requirementDescription: 'Core CS Courses',
            selectedCourses: [
              { code: 'CS 101', title: 'Intro to Programming', credits: 3 },
              { code: 'CS 201', title: 'Data Structures', credits: 4 },
            ],
          },
        ],
      },
    ],
    generalEducation: [
      {
        requirementId: 'gen-ed-1',
        requirementDescription: 'General Education',
        selectedCourses: [
          { code: 'ENG 101', title: 'English Composition', credits: 3 },
          { code: 'MATH 120', title: 'Calculus I', credits: 4 },
        ],
      },
    ],
    totalSelectedCredits: 14,
  };
}

export function createMockCreditDistributionResult(): ToolResultFor<'credit_distribution'> {
  return {
    type: 'balanced',
    includeSecondaryCourses: true,
    selectedTermIds: ['fall', 'spring', 'summer'],
    suggestedDistribution: createMockSuggestedDistribution(),
  };
}

export function createMockSuggestedDistribution(): SemesterAllocation[] {
  return [
    { term: 'Fall 2024', termType: 'primary', year: 2024, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
    { term: 'Spring 2025', termType: 'primary', year: 2025, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
    { term: 'Summer 2025', termType: 'secondary', year: 2025, suggestedCredits: 6, minCredits: 3, maxCredits: 9 },
    { term: 'Fall 2025', termType: 'primary', year: 2025, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
    { term: 'Spring 2026', termType: 'primary', year: 2026, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
    { term: 'Summer 2026', termType: 'secondary', year: 2026, suggestedCredits: 6, minCredits: 3, maxCredits: 9 },
    { term: 'Fall 2026', termType: 'primary', year: 2026, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
    { term: 'Spring 2027', termType: 'primary', year: 2027, suggestedCredits: 13, minCredits: 12, maxCredits: 18 },
  ];
}

export function createMockMilestonesResult(): ToolResultFor<'milestones'> {
  return {
    milestones: [
      {
        type: 'internship',
        title: 'Summer Internship',
        timing: 'middle',
      },
    ],
  };
}

export function createMockMilestonesAndConstraintsResult(): ToolResultFor<'milestones_and_constraints'> {
  return {
    milestones: [
      {
        type: 'internship',
        title: 'Summer Internship',
        timing: 'middle',
      },
      {
        type: 'study_abroad',
        title: 'Study Abroad - Spain',
        timing: 'before_last_year',
      },
    ],
    workConstraints: {
      workStatus: 'part_time',
      additionalNotes: 'Working 15-20 hours per week on campus',
    },
  };
}

export function createMockGeneratePlanResult(action: 'generate' | 'review' = 'generate'): ToolResultFor<'generate_plan_confirmation'> {
  if (action === 'review') {
    return { action: 'review' };
  }

  return {
    action: 'generate',
    mode: 'automatic',
    startTerm: 'Fall',
    startYear: 2024,
  };
}

export function createMockActiveFeedbackPlanResult(action: 'generate' | 'close' = 'generate'): ToolResultFor<'active_feedback_plan'> {
  return {
    action,
    draftPlan: action === 'generate' ? { mock: 'plan data' } : undefined,
  };
}

export function createMockCareerSuggestionsResult(): ToolResultFor<'career_suggestions'> {
  return {
    selectedCareer: 'Software Engineer',
  };
}

export function createMockProgramSuggestionsResult(): ToolResultFor<'program_suggestions'> {
  return [
    { programName: 'Computer Science', programType: 'major' },
    { programName: 'Mathematics', programType: 'minor' },
  ];
}

// ============================================================================
// Mock Conversation State Builders
// ============================================================================

/**
 * Creates a mock state at a specific step in the pipeline
 * Progressively applies state updates for all prior steps
 */
export function createMockStateAtStep(
  step: ConversationStep,
  overrides?: Partial<ConversationState>
): ConversationState {
  const userId = 'mock-user-123';
  const conversationId = 'mock-conv-456';
  const universityId = 1;

  let state = createInitialState(conversationId, userId, universityId);

  // Apply updates based on step
  const stepOrder = [
    ConversationStep.INITIALIZE,
    ConversationStep.PROFILE_CHECK,
    ConversationStep.TRANSCRIPT_CHECK,
    ConversationStep.PROGRAM_SELECTION,
    ConversationStep.COURSE_METHOD,
    ConversationStep.COURSE_SELECTION,
    ConversationStep.CREDIT_DISTRIBUTION,
    ConversationStep.MILESTONES_AND_CONSTRAINTS,
    ConversationStep.GENERATING_PLAN,
    ConversationStep.COMPLETE,
  ];

  const targetIndex = stepOrder.indexOf(step);

  // Apply all steps up to target
  for (let i = 0; i <= targetIndex; i++) {
    state = applyMockStepData(state, stepOrder[i]);
  }

  return {
    ...state,
    ...overrides,
  };
}

/**
 * Applies mock data for a specific step
 */
function applyMockStepData(state: ConversationState, step: ConversationStep): ConversationState {
  switch (step) {
    case ConversationStep.INITIALIZE:
      return updateState(state, {
        step: ConversationStep.INITIALIZE,
        completedStep: ConversationStep.INITIALIZE,
      });

    case ConversationStep.PROFILE_CHECK:
      return updateState(state, {
        step: ConversationStep.PROFILE_CHECK,
        data: {
          studentType: 'undergraduate',
        },
        completedStep: ConversationStep.PROFILE_CHECK,
      });

    case ConversationStep.TRANSCRIPT_CHECK:
      return updateState(state, {
        step: ConversationStep.TRANSCRIPT_CHECK,
        data: {
          hasTranscript: true,
          transcriptUploaded: false,
          needsTranscriptUpdate: false,
        },
        completedStep: ConversationStep.TRANSCRIPT_CHECK,
      });

    case ConversationStep.PROGRAM_SELECTION:
      return updateState(state, {
        step: ConversationStep.PROGRAM_SELECTION,
        data: {
          selectedPrograms: [
            { programId: 42, programName: 'Computer Science', programType: 'major' },
            { programId: 75, programName: 'Mathematics', programType: 'minor' },
            { programId: 1, programName: 'General Education', programType: 'general_education' },
          ],
        },
        completedStep: ConversationStep.PROGRAM_SELECTION,
      });

    case ConversationStep.COURSE_METHOD:
      return updateState(state, {
        step: ConversationStep.COURSE_METHOD,
        data: {
          courseSelectionMethod: 'manual',
        },
        completedStep: ConversationStep.COURSE_METHOD,
      });

    case ConversationStep.COURSE_SELECTION:
      return updateState(state, {
        step: ConversationStep.COURSE_SELECTION,
        data: {
          selectedCourses: [] as CourseSelection[], // Mock courses
          totalSelectedCredits: 120,
        },
        completedStep: ConversationStep.COURSE_SELECTION,
      });

    case ConversationStep.CREDIT_DISTRIBUTION:
      return updateState(state, {
        step: ConversationStep.CREDIT_DISTRIBUTION,
        data: {
          creditDistributionStrategy: {
            type: 'balanced',
            includeSecondaryCourses: true,
            selectedTermIds: ['fall', 'spring', 'summer'],
            suggestedDistribution: createMockSuggestedDistribution(),
          },
        },
        completedStep: ConversationStep.CREDIT_DISTRIBUTION,
      });

    case ConversationStep.MILESTONES_AND_CONSTRAINTS:
      return updateState(state, {
        step: ConversationStep.MILESTONES_AND_CONSTRAINTS,
        data: {
          milestones: [
            {
              type: 'internship',
              title: 'Summer Internship',
              timing: 'middle',
            },
          ],
          workConstraints: {
            workStatus: 'part_time',
            additionalNotes: 'Working 15-20 hours per week',
          },
        },
        completedStep: ConversationStep.MILESTONES_AND_CONSTRAINTS,
      });

    case ConversationStep.GENERATING_PLAN:
      return updateState(state, {
        step: ConversationStep.GENERATING_PLAN,
        data: {
          planStartTerm: 'Fall',
          planStartYear: 2024,
        },
        completedStep: ConversationStep.GENERATING_PLAN,
      });

    case ConversationStep.COMPLETE:
      return updateState(state, {
        step: ConversationStep.COMPLETE,
        completedStep: ConversationStep.COMPLETE,
      });

    default:
      return state;
  }
}

// ============================================================================
// Composite Mock Pipeline Data
// ============================================================================

export interface MockPipelineData {
  studentProfile: ReturnType<typeof createMockStudentProfile>;
  academicTerms: AcademicTermsConfig;
  hasCourses: boolean;
  userId: string;
  initialState: ConversationState;
}

export function createMockPipelineData(overrides?: {
  studentType?: StudentType;
  hasCourses?: boolean;
  startStep?: ConversationStep;
}): MockPipelineData {
  const studentProfile = createMockStudentProfile({
    student_type: overrides?.studentType || 'undergraduate',
  });

  return {
    studentProfile,
    academicTerms: createMockAcademicTerms(),
    hasCourses: overrides?.hasCourses ?? true,
    userId: studentProfile.id,
    initialState: createMockStateAtStep(overrides?.startStep || ConversationStep.INITIALIZE),
  };
}

// ============================================================================
// Mock Tool Result Generator (by name)
// ============================================================================

/**
 * Generates a mock result for any tool type
 */
export function createMockToolResult<T extends ToolType>(toolType: T): ToolResultFor<T> {
  switch (toolType) {
    case 'profile_check':
      return createMockProfileCheckResult() as ToolResultFor<T>;
    case 'transcript_check':
      return createMockTranscriptCheckResult() as ToolResultFor<T>;
    case 'student_type':
      return createMockStudentTypeResult() as ToolResultFor<T>;
    case 'program_selection':
      return createMockProgramSelectionResult() as ToolResultFor<T>;
    case 'course_selection':
      return createMockCourseSelectionResult() as ToolResultFor<T>;
    case 'credit_distribution':
      return createMockCreditDistributionResult() as ToolResultFor<T>;
    case 'milestones':
      return createMockMilestonesResult() as ToolResultFor<T>;
    case 'milestones_and_constraints':
      return createMockMilestonesAndConstraintsResult() as ToolResultFor<T>;
    case 'generate_plan_confirmation':
      return createMockGeneratePlanResult() as ToolResultFor<T>;
    case 'active_feedback_plan':
      return createMockActiveFeedbackPlanResult() as ToolResultFor<T>;
    case 'career_suggestions':
      return createMockCareerSuggestionsResult() as ToolResultFor<T>;
    case 'program_suggestions':
      return createMockProgramSuggestionsResult() as ToolResultFor<T>;
    default:
      throw new Error(`No mock result generator for tool type: ${toolType}`);
  }
}

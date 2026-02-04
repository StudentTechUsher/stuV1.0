/**
 * Type definitions for the graduation plan chatbot
 */

import { SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

// Conversation steps in the grad plan creation flow
export enum ConversationStep {
  INITIALIZE = 'initialize',
  PROFILE_CHECK = 'profile_check', // NEW - replaces profile_setup, career_selection, student_type
  CAREER_PATHFINDER = 'career_pathfinder', // Optional career exploration
  PROGRAM_PATHFINDER = 'program_pathfinder', // Optional program exploration
  TRANSCRIPT_CHECK = 'transcript_check',
  PROGRAM_SELECTION = 'program_selection',
  COURSE_METHOD = 'course_method',
  COURSE_SELECTION = 'course_selection',
  ELECTIVES = 'electives',
  STUDENT_INTERESTS = 'student_interests',
  CREDIT_DISTRIBUTION = 'credit_distribution', // NEW - credit strategy selection
  MILESTONES_AND_CONSTRAINTS = 'milestones_and_constraints', // NEW - combines milestones + concerns
  GENERATING_PLAN = 'generating_plan',
  COMPLETE = 'complete',
}

// Student type selection
export type StudentType = 'undergraduate' | 'honor' | 'graduate';

// Course selection method
export type CourseSelectionMethod = 'ai' | 'manual';

// Individual course selection for manual mode
export interface CourseSelection {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  term: string;
  fulfillsRequirements: string[]; // Requirement IDs this course fulfills
}

// Elective course
export interface ElectiveCourse {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  reason?: string; // Why the student is considering this elective
}

// Milestone in graduation plan
export interface Milestone {
  id?: string;
  type: 'internship' | 'study_abroad' | 'research' | 'study_break' | 'honors_thesis' | 'custom';
  title: string;
  timing: 'beginning' | 'middle' | 'before_last_year' | 'after_graduation' | 'specific_term';
  term?: string;
  year?: number;
}

// Credit distribution strategy
export interface CreditDistributionStrategy {
  type: 'fast_track' | 'balanced' | 'explore';
  includeSecondaryCourses: boolean;
  selectedTermIds?: string[]; // Term IDs selected by user (e.g., ["fall", "winter", "spring"])
  suggestedDistribution: SemesterAllocation[];
}

// Work constraints
export interface WorkConstraints {
  workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable';
  additionalNotes: string;
}

// Program selection
export interface ProgramSelection {
  programId: number;
  programName: string;
  programType: 'major' | 'minor' | 'honors' | 'graduate' | 'general_education';
}

// Main conversation state
export interface ConversationState {
  // Metadata
  conversationId: string;
  userId: string;
  universityId: number;
  createdAt: Date;
  updatedAt: Date;

  // Current progress
  currentStep: ConversationStep;
  completedSteps: ConversationStep[];

  // Collected data
  collectedData: {
    // Student type (from profile)
    studentType?: StudentType | null;

    // Gen Ed selection (still part of grad plan)
    selectedGenEdProgramId: number | null;
    selectedGenEdProgramName: string | null;

    // Transcript status
    hasTranscript: boolean;
    needsTranscriptUpdate: boolean;
    transcriptUploaded: boolean;
    planStartTerm: string | null;
    planStartYear: number | null;

    // Program selections
    selectedPrograms: ProgramSelection[];

    // Course selection
    courseSelectionMethod: CourseSelectionMethod | null;
    selectedCourses: CourseSelection[];
    totalSelectedCredits: number; // Total credits from course selection

    // Electives
    electiveCourses: ElectiveCourse[];
    needsElectives: boolean;

    // Student interests
    studentInterests: string | null;

    // NEW: Credit distribution strategy
    creditDistributionStrategy: CreditDistributionStrategy | null;

    // NEW: Milestones (structured data, not JSON string)
    milestones: Milestone[];

    // NEW: Work constraints
    workConstraints: WorkConstraints | null;
  };

  // Tool execution tracking
  pendingToolCall: string | null;
  lastToolResult: ToolResult | null;
}

// Tool execution result
export interface ToolResult {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

// Chat message in the conversation
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}

// Tool call from OpenAI
export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

// State update action
export interface StateUpdate {
  step?: ConversationStep;
  data?: Partial<ConversationState['collectedData']>;
  completedStep?: ConversationStep;
  pendingToolCall?: string | null;
  lastToolResult?: ToolResult | null;
}

// Progress tracking for UI
export interface ConversationProgress {
  currentStepNumber: number;
  totalSteps: number;
  currentStepLabel: string;
  completionPercentage: number;
  collectedFields: {
    field: string;
    label: string;
    value: string | string[];
    completed: boolean;
  }[];
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

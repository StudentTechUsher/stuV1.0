/**
 * Type definitions for the graduation plan chatbot
 */

// Conversation steps in the grad plan creation flow
export enum ConversationStep {
  INITIALIZE = 'initialize',
  PROFILE_SETUP = 'profile_setup',
  CAREER_SELECTION = 'career_selection',
  CAREER_PATHFINDER = 'career_pathfinder',
  PROGRAM_PATHFINDER = 'program_pathfinder',
  TRANSCRIPT_CHECK = 'transcript_check',
  STUDENT_TYPE = 'student_type',
  PROGRAM_SELECTION = 'program_selection',
  COURSE_METHOD = 'course_method',
  COURSE_SELECTION = 'course_selection',
  ELECTIVES = 'electives',
  STUDENT_INTERESTS = 'student_interests',
  ADDITIONAL_CONCERNS = 'additional_concerns',
  GENERATING_PLAN = 'generating_plan',
  COMPLETE = 'complete',
}

// Student type selection
export type StudentType = 'undergraduate' | 'graduate';

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

// Program selection
export interface ProgramSelection {
  programId: number;
  programName: string;
  programType: 'major' | 'minor' | 'graduate' | 'general_education';
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
    // Profile information
    estGradDate: string | null;
    estGradSem: string | null;
    careerGoals: string | null;

    // Transcript status
    hasTranscript: boolean;
    needsTranscriptUpdate: boolean;
    transcriptUploaded: boolean;

    // Student classification
    studentType: StudentType | null;

    // Program selections
    selectedPrograms: ProgramSelection[];

    // Course selection
    courseSelectionMethod: CourseSelectionMethod | null;
    selectedCourses: CourseSelection[];

    // Electives
    electiveCourses: ElectiveCourse[];
    needsElectives: boolean;

    // Student interests
    studentInterests: string | null;

    // Additional information
    additionalConcerns: string | null;
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

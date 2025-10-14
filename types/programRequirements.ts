/**
 * Program Requirements Type System
 *
 * This file defines the complete type system for authoring and validating
 * program requirements. It supports multiple requirement types, constraints,
 * progress tracking, and student-facing views.
 */

// ============================================================================
// COURSE DEFINITIONS
// ============================================================================

export interface Course {
  code: string;
  title: string;
  credits: number;
  prerequisite?: string;
  minCredits?: number; // For variable credit courses
  maxCredits?: number; // For variable credit courses
  terms?: string[]; // Specific terms this course is offered (e.g., ["Fall", "Spring"])
  termsOffered?: string[]; // Alias for terms (for compatibility with examples)
  maxRepeats?: number; // Maximum times this course can be repeated (1 = take once, 2 = can repeat once, etc.)
  sequenceGroup?: string; // Group identifier for sequenced courses (e.g., "IS Upper Division Core")
  sequenceOrder?: number; // Order within sequence group (1 = first block, 2 = second block)
}

// ============================================================================
// REQUIREMENT TYPES
// ============================================================================

export type RequirementType =
  | 'allOf'           // Must complete all courses/subrequirements
  | 'chooseNOf'       // Must complete N out of available options
  | 'creditBucket'    // Must complete enough to reach credit threshold
  | 'optionGroup'     // Choose one track from multiple options
  | 'sequence'        // Courses must be taken in order (by term/cohort)
  | 'noteOnly';       // Informational only, no courses

// ============================================================================
// CONSTRAINT DEFINITIONS
// ============================================================================

export interface RequirementConstraints {
  // For 'chooseNOf' - how many items must be completed
  n?: number;

  // For 'creditBucket' - minimum total credits needed
  minTotalCredits?: number;

  // For 'creditBucket' - maximum total credits allowed (optional cap)
  maxTotalCredits?: number;

  // Track exclusivity - can only pick courses from one track
  trackExclusive?: boolean;

  // Prevent courses from counting toward multiple requirements
  noDoubleCount?: boolean;

  // Per-group caps (e.g., "max 2 courses from 100-level")
  groupCaps?: GroupCap[];

  // Per-course caps (e.g., "course can only count once")
  courseCaps?: CourseCap[];

  // Admissions gate - must meet requirement before being admitted to program
  admissionsGate?: boolean;

  // Minimum grade requirement
  minGrade?: string; // e.g., "B", "C+", "2.7"

  // GPA requirement within this requirement group
  minGPA?: number;
}

export interface GroupCap {
  groupId: string;
  groupLabel: string; // e.g., "100-level courses", "Electives"
  maxCourses?: number;
  maxCredits?: number;
  courseCodePattern?: string; // Regex pattern to match courses
}

export interface CourseCap {
  courseCode: string;
  maxCount: number; // How many times this course can count
}

// ============================================================================
// REQUIREMENT DEFINITIONS
// ============================================================================

export interface BaseRequirement {
  requirementId: number | string; // Support both numeric and string IDs (e.g., "1.1", "3.2")
  description: string;
  notes?: string;
  type: RequirementType;
  constraints?: RequirementConstraints;

  // Additional text-based requirements (no courses)
  otherRequirement?: string; // Text-only additional requirement (e.g., "Apply and be formally accepted")
  steps?: string[]; // List of text-only steps (alternative to courses)

  // Sequencing information
  sequencingNotes?: string; // Notes about course sequencing/ordering within this requirement

  // Metadata for authoring
  displayOrder?: number;
  isCollapsible?: boolean;
  colorTag?: string; // For visual organization
}

// AllOf: Complete all courses
export interface AllOfRequirement extends BaseRequirement {
  type: 'allOf';
  courses?: Course[];
  subRequirements?: ProgramRequirement[]; // Nested requirements (standardize naming)
  subrequirements?: ProgramRequirement[]; // Deprecated alias for backward compatibility
}

// ChooseNOf: Complete N courses/subrequirements
export interface ChooseNOfRequirement extends BaseRequirement {
  type: 'chooseNOf';
  courses?: Course[];
  subRequirements?: ProgramRequirement[]; // Nested requirements (standardize naming)
  subrequirements?: ProgramRequirement[]; // Deprecated alias for backward compatibility
  constraints: RequirementConstraints & {
    n: number; // Required field for this type
  };
}

// CreditBucket: Accumulate credits to threshold
export interface CreditBucketRequirement extends BaseRequirement {
  type: 'creditBucket';
  courses?: Course[];
  subRequirements?: ProgramRequirement[]; // Support nested sub-requirements (e.g., emphasis areas)
  constraints: RequirementConstraints & {
    minTotalCredits: number; // Required field for this type
    maxTotalCredits?: number; // Optional maximum (e.g., "up to 8.0 credit hours")
  };
}

// OptionGroup: Choose one track
export interface OptionGroupRequirement extends BaseRequirement {
  type: 'optionGroup';
  options: {
    trackId: string;
    trackName: string;
    requirements: ProgramRequirement[];
  }[];
  constraints?: RequirementConstraints & {
    trackExclusive: true; // Always exclusive
  };
}

// Sequence: Courses in order
export interface SequenceRequirement extends BaseRequirement {
  type: 'sequence';
  sequence: {
    sequenceId: number;
    term?: string; // e.g., "Fall 2024", "Year 1 Spring"
    cohort?: string; // e.g., "Junior", "First Year"
    courses: Course[];
  }[];
}

// NoteOnly: Informational steps
export interface NoteOnlyRequirement extends BaseRequirement {
  type: 'noteOnly';
  steps?: string[]; // List of informational steps
}

export type ProgramRequirement =
  | AllOfRequirement
  | ChooseNOfRequirement
  | CreditBucketRequirement
  | OptionGroupRequirement
  | SequenceRequirement
  | NoteOnlyRequirement;

// ============================================================================
// PROGRAM STRUCTURE
// ============================================================================

export interface ProgramRequirementsStructure {
  programRequirements: ProgramRequirement[];
  metadata?: {
    version?: string;
    lastModified?: string;
    authorId?: string;
    totalMinCredits?: number;
    estimatedCompletionTerms?: number;
  };
}

// ============================================================================
// PROGRESS TRACKING (Student View)
// ============================================================================

export interface CourseCompletion {
  courseCode: string;
  title: string;
  creditsEarned: number;
  grade?: string;
  term?: string;
  countsTowardRequirementIds: number[]; // Which requirements this satisfies
}

export interface RequirementProgress {
  requirementId: number | string; // Support string IDs for nested requirements
  description: string;
  type: RequirementType;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';

  // Progress indicators
  completedCount?: number; // For allOf, chooseNOf
  requiredCount?: number;
  completedCredits?: number; // For creditBucket
  requiredCredits?: number;

  // Which courses have been applied to this requirement
  appliedCourses: CourseCompletion[];

  // What's left to complete
  remainingCourses?: Course[];
  remainingOptions?: string[]; // For optionGroup

  // Nested sub-requirement progress
  subRequirementProgress?: RequirementProgress[];

  // Validation messages
  warnings?: string[]; // e.g., "This course is already used in another requirement"
  blockers?: string[]; // e.g., "Must complete prerequisites first"
}

export interface StudentProgress {
  programId: string;
  studentId: string;
  overallProgress: {
    totalRequirements: number;
    completedRequirements: number;
    totalCreditsRequired: number;
    totalCreditsEarned: number;
    percentComplete: number;
  };
  requirementProgress: RequirementProgress[];

  // Track exclusions and conflicts
  usedCourses: Map<string, number[]>; // courseCode -> requirementIds
  selectedTracks: Map<number, string>; // requirementId -> trackId
}

// ============================================================================
// VALIDATION & EVALUATION
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  requirementId?: number | string; // Support string IDs
  courseCode?: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  requirementId?: number | string; // Support string IDs
  courseCode?: string;
  message: string;
  canProceed: boolean;
}

// ============================================================================
// AUTHORING UI STATE
// ============================================================================

export interface AuthoringState {
  requirements: ProgramRequirement[];
  selectedRequirementId: number | string | null; // Support string IDs
  editMode: 'author' | 'preview' | 'json';
  validationResult: ValidationResult;
  isDirty: boolean;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Helper function to get sub-requirements from any requirement type,
 * handling both naming conventions (subRequirements vs subrequirements)
 */
export function getSubRequirements(req: ProgramRequirement): ProgramRequirement[] | undefined {
  if ('subRequirements' in req) return req.subRequirements;
  if ('subrequirements' in req) return req.subrequirements;
  return undefined;
}

/**
 * Helper function to get courses from any requirement type
 */
export function getCourses(req: ProgramRequirement): Course[] | undefined {
  if ('courses' in req) return req.courses;
  return undefined;
}

export type RequirementTypeOption = {
  value: RequirementType;
  label: string;
  description: string;
  icon: string;
  supportsSubrequirements: boolean;
  requiredConstraints: string[];
};

export const REQUIREMENT_TYPE_OPTIONS: RequirementTypeOption[] = [
  {
    value: 'allOf',
    label: 'Complete All',
    description: 'Student must complete all courses in this requirement',
    icon: '✓',
    supportsSubrequirements: true,
    requiredConstraints: []
  },
  {
    value: 'chooseNOf',
    label: 'Choose N',
    description: 'Student must complete N courses from the list',
    icon: '#',
    supportsSubrequirements: true,
    requiredConstraints: ['n']
  },
  {
    value: 'creditBucket',
    label: 'Credit Threshold',
    description: 'Student must earn a minimum number of credits',
    icon: '∑',
    supportsSubrequirements: true,
    requiredConstraints: ['minTotalCredits']
  },
  {
    value: 'optionGroup',
    label: 'Track Selection',
    description: 'Student chooses one track/option to complete',
    icon: '⇄',
    supportsSubrequirements: true,
    requiredConstraints: []
  },
  {
    value: 'sequence',
    label: 'Sequence',
    description: 'Courses must be completed in a specific order',
    icon: '→',
    supportsSubrequirements: false,
    requiredConstraints: []
  },
  {
    value: 'noteOnly',
    label: 'Information Only',
    description: 'Informational requirement with no courses',
    icon: 'ℹ',
    supportsSubrequirements: false,
    requiredConstraints: []
  }
];

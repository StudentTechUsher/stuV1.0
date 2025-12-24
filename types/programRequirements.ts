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
// GEN ED SPECIFIC TYPES
// ============================================================================

/**
 * Gen Ed credit format
 * Gen eds use a different credit structure than majors
 */
export interface GenEdCredits {
  fixed?: number;
  variable?: boolean;
  min?: number;
  max?: number;
}

/**
 * Gen Ed course block
 * Represents a single course in the gen ed structure
 */
export interface GenEdCourseBlock {
  type: 'course';
  code: string;
  title: string;
  credits: GenEdCredits;
  status?: 'active' | 'retired';
  prerequisite?: string;
  constraints?: Array<{
    kind: string;
    area?: string;
    value?: number;
    start_term?: string;
    end_term?: string;
    start?: string;
  }>;
  notes?: string[];
}

/**
 * Gen Ed option block
 * Represents a set of options where students choose one
 */
export interface GenEdOptionBlock {
  type: 'option';
  label: string;
  title?: string;
  rule?: {
    type: string;
    min_count?: number;
    of_count?: number;
    unit?: string;
  };
  notes?: string[];
  blocks: GenEdBlock[];
}

/**
 * Gen Ed requirement block
 * Represents a nested requirement within a gen ed
 */
export interface GenEdRequirementBlock {
  type: 'requirement';
  label: string;
  rule?: {
    type: string;
    min_count?: number;
    unit?: string;
  };
  blocks: GenEdBlock[];
}

/**
 * Union type of all gen ed block types
 */
export type GenEdBlock = GenEdCourseBlock | GenEdOptionBlock | GenEdRequirementBlock;

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
 * Convert gen ed credit format to number
 * Gen eds use: {fixed: 2} or {variable: true, min: 1.5, max: 1.5}
 * We need: number
 */
function convertCreditsFormat(credits: unknown): number {
  if (typeof credits === 'number') {
    return credits;
  }

  if (credits && typeof credits === 'object') {
    const creditsObj = credits as Record<string, unknown>;

    // Fixed credits: {fixed: 2}
    if (creditsObj.fixed !== undefined && typeof creditsObj.fixed === 'number') {
      return creditsObj.fixed;
    }

    // Variable credits: use min if available, otherwise max
    if (creditsObj.variable) {
      if (creditsObj.min !== undefined && typeof creditsObj.min === 'number') {
        return creditsObj.min;
      }
      if (creditsObj.max !== undefined && typeof creditsObj.max === 'number') {
        return creditsObj.max;
      }
    }
  }

  // Fallback
  return 0;
}

/**
 * Get min credits for variable credit courses
 */
function getMinCredits(credits: unknown): number | undefined {
  if (credits && typeof credits === 'object') {
    const creditsObj = credits as Record<string, unknown>;
    if (creditsObj.variable && creditsObj.min !== undefined && typeof creditsObj.min === 'number') {
      return creditsObj.min;
    }
  }
  return undefined;
}

/**
 * Get max credits for variable credit courses
 */
function getMaxCredits(credits: unknown): number | undefined {
  if (credits && typeof credits === 'object') {
    const creditsObj = credits as Record<string, unknown>;
    if (creditsObj.variable && creditsObj.max !== undefined && typeof creditsObj.max === 'number') {
      return creditsObj.max;
    }
  }
  return undefined;
}

/**
 * Recursively extract courses from nested blocks array (gen ed structure)
 */
function extractCoursesFromBlocks(blocks: unknown[]): Course[] {
  const courses: Course[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    const blockObj = block as Record<string, unknown>;

    // Course block
    if (blockObj.type === 'course' && blockObj.code && typeof blockObj.code === 'string') {
      courses.push({
        code: blockObj.code,
        title: (blockObj.title as string) || '',
        credits: convertCreditsFormat(blockObj.credits),
        prerequisite: blockObj.prerequisite as string | undefined,
        minCredits: getMinCredits(blockObj.credits),
        maxCredits: getMaxCredits(blockObj.credits),
      });
    }

    // Option block with nested blocks
    if (blockObj.type === 'option' && Array.isArray(blockObj.blocks)) {
      courses.push(...extractCoursesFromBlocks(blockObj.blocks));
    }

    // Requirement block with nested blocks
    if (blockObj.type === 'requirement' && Array.isArray(blockObj.blocks)) {
      courses.push(...extractCoursesFromBlocks(blockObj.blocks));
    }
  }

  return courses;
}

/**
 * Helper function to get courses from any requirement type
 * Supports both direct 'courses' array and 'blocks' structure
 */
export function getCourses(req: ProgramRequirement): Course[] | undefined {
  // Direct courses array
  if ('courses' in req && req.courses) {
    return req.courses;
  }

  // Courses nested in blocks (Gen Ed structure)
  if ('blocks' in req && Array.isArray((req as Record<string, unknown>).blocks)) {
    const allCourses: Course[] = [];
    const blocks = (req as Record<string, unknown>).blocks as unknown[];

    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;

      const blockObj = block as Record<string, unknown>;

      // Handle direct course blocks (type: "course")
      if (blockObj.type === 'course' && blockObj.code && typeof blockObj.code === 'string') {
        allCourses.push({
          code: blockObj.code,
          title: (blockObj.title as string) || '',
          credits: convertCreditsFormat(blockObj.credits),
          prerequisite: blockObj.prerequisite as string | undefined,
          minCredits: getMinCredits(blockObj.credits),
          maxCredits: getMaxCredits(blockObj.credits),
        });
      }

      // Handle option blocks (type: "option") - recursively extract courses
      if (blockObj.type === 'option' && Array.isArray(blockObj.blocks)) {
        const nestedCourses = extractCoursesFromBlocks(blockObj.blocks);
        allCourses.push(...nestedCourses);
      }

      // Handle requirement blocks (type: "requirement") - recursively extract courses
      if (blockObj.type === 'requirement' && Array.isArray(blockObj.blocks)) {
        const nestedCourses = extractCoursesFromBlocks(blockObj.blocks);
        allCourses.push(...nestedCourses);
      }

      // Handle old format (block.courses array) for backward compatibility
      if (blockObj.courses && Array.isArray(blockObj.courses)) {
        allCourses.push(...(blockObj.courses as Course[]));
      }
    }

    return allCourses.length > 0 ? allCourses : undefined;
  }

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

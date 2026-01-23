/**
 * Grad Plan Generation Service
 *
 * Provides credit calculation and semester distribution logic for graduation plans.
 * This service handles programmatic calculations that were previously done by AI.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AcademicTermsConfig {
  terms: {
    primary: Array<{ id: string; label: string }>;
    secondary: Array<{ id: string; label: string }>;
  };
  system: string; // "semester_with_terms", "quarter", etc.
  ordering: string[]; // ["fall", "winter", "spring", "summer"]
  academic_year_start: string; // "fall"
}

export interface CreditDistributionInput {
  totalCredits: number;
  strategy: 'fast_track' | 'balanced' | 'explore';
  includeSecondaryCourses?: boolean; // Deprecated: use selectedTermIds instead
  selectedTermIds?: string[]; // Term IDs to include (e.g., ["fall", "winter", "spring"])
  academicTerms: AcademicTermsConfig;
  admissionYear: number;
  admissionTerm: string;
  graduationDate: Date;
}

export interface CompletionEstimateInput {
  totalCredits: number;
  strategy: 'fast_track' | 'balanced' | 'explore';
  includeSecondaryCourses?: boolean; // Deprecated: use selectedTermIds instead
  selectedTermIds?: string[]; // Term IDs to include (e.g., ["fall", "winter", "spring"])
  academicTerms: AcademicTermsConfig;
  admissionYear: number;
  admissionTerm: string;
}

export interface CompletionEstimate {
  term: string;
  year: number;
  termType: 'primary' | 'secondary';
  totalTerms: number;
}

export interface SemesterAllocation {
  term: string; // e.g., "Fall 2024"
  termType: 'primary' | 'secondary';
  year: number;
  suggestedCredits: number;
  minCredits: number;
  maxCredits: number;
}

export interface CourseSelection {
  credits: number;
  // ... other course properties
}

export interface ProgramSelection {
  target_total_credits?: number;
  // ... other program properties
}

// ============================================================================
// Custom Errors
// ============================================================================

export class CreditDistributionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CreditDistributionError';
  }
}

export class InvalidTermSequenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTermSequenceError';
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Calculates semester-by-semester credit distribution based on strategy
 * @param input - Credit distribution parameters
 * @returns Array of semester allocations with suggested credit loads
 */
export function calculateSemesterDistribution(
  input: CreditDistributionInput
): SemesterAllocation[] {
  const {
    totalCredits,
    strategy,
    includeSecondaryCourses,
    selectedTermIds,
    academicTerms,
    admissionYear,
    admissionTerm,
    graduationDate,
  } = input;

  // Normalize selected terms (support both old and new API)
  const normalizedSelectedTermIds = selectedTermIds || (
    includeSecondaryCourses
      ? [...academicTerms.terms.primary.map(t => t.id), ...academicTerms.terms.secondary.map(t => t.id)]
      : academicTerms.terms.primary.map(t => t.id)
  );

  // Generate term sequence from admission to graduation
  const termSequence = generateTermSequence(
    admissionYear,
    admissionTerm,
    graduationDate,
    academicTerms,
    normalizedSelectedTermIds
  );

  if (termSequence.length === 0) {
    throw new CreditDistributionError('No terms available between admission and graduation');
  }

  // Determine credit load ranges based on strategy
  const loadRanges = getStrategyLoadRanges(strategy);

  // Calculate average credits per term
  const avgCreditsPerTerm = totalCredits / termSequence.length;

  // Distribute credits across terms
  const allocations: SemesterAllocation[] = [];
  let remainingCredits = totalCredits;

  for (let i = 0; i < termSequence.length; i++) {
    const termInfo = termSequence[i];
    const isLastTerm = i === termSequence.length - 1;

    // Get appropriate load range for this term type
    const { min, max, target } = termInfo.type === 'primary'
      ? loadRanges.primary
      : loadRanges.secondary;

    let suggestedCredits: number;

    if (isLastTerm) {
      // Last term: take whatever is remaining
      suggestedCredits = Math.max(min, Math.min(max, remainingCredits));
    } else {
      // Regular term: aim for target, adjust based on remaining credits
      const termsLeft = termSequence.length - i;
      const avgNeeded = remainingCredits / termsLeft;

      // Prefer the target, but adjust if we're running high or low
      if (avgNeeded > target + 2) {
        suggestedCredits = Math.min(max, Math.ceil(avgNeeded));
      } else if (avgNeeded < target - 2) {
        suggestedCredits = Math.max(min, Math.floor(avgNeeded));
      } else {
        suggestedCredits = target;
      }

      // Ensure we don't exceed bounds
      suggestedCredits = Math.max(min, Math.min(max, suggestedCredits));
    }

    allocations.push({
      term: termInfo.term,
      termType: termInfo.type,
      year: termInfo.year,
      suggestedCredits,
      minCredits: min,
      maxCredits: max,
    });

    remainingCredits -= suggestedCredits;
  }

  // Adjust if we have leftover credits (distribute to earlier terms)
  if (remainingCredits > 0) {
    redistributeRemainingCredits(allocations, remainingCredits);
  }

  return allocations;
}

/**
 * AUTHORIZATION: PUBLIC
 * Estimates completion term based on strategy and term preferences
 * @param input - Completion estimate parameters
 * @returns Estimated completion term details
 */
export function estimateCompletionTerm(
  input: CompletionEstimateInput
): CompletionEstimate {
  const {
    totalCredits,
    strategy,
    includeSecondaryCourses,
    selectedTermIds,
    academicTerms,
    admissionYear,
    admissionTerm,
  } = input;

  // Normalize selected terms (support both old and new API)
  const normalizedSelectedTermIds = selectedTermIds || (
    includeSecondaryCourses
      ? [...academicTerms.terms.primary.map(t => t.id), ...academicTerms.terms.secondary.map(t => t.id)]
      : academicTerms.terms.primary.map(t => t.id)
  );

  if (totalCredits <= 0) {
    throw new CreditDistributionError('Total credits must be greater than 0');
  }

  if (!academicTerms.ordering || academicTerms.ordering.length === 0) {
    throw new CreditDistributionError('Academic term ordering is not configured');
  }

  const startTermLower = admissionTerm.toLowerCase();
  let currentTermIndex = academicTerms.ordering.findIndex(
    term => term.toLowerCase() === startTermLower
  );

  if (currentTermIndex === -1) {
    throw new InvalidTermSequenceError(`Invalid start term: ${admissionTerm}`);
  }

  const loadRanges = getStrategyLoadRanges(strategy);
  let remainingCredits = totalCredits;
  let currentYear = admissionYear;
  let totalTerms = 0;
  let safetyCounter = 0;
  const maxIterations = academicTerms.ordering.length * 50;

  while (remainingCredits > 0) {
    if (safetyCounter++ > maxIterations) {
      throw new CreditDistributionError('Estimated completion exceeded a reasonable term count');
    }

    const termId = academicTerms.ordering[currentTermIndex];

    const isPrimary = academicTerms.terms.primary.some(
      t => t.id.toLowerCase() === termId.toLowerCase()
    );
    const isSecondary = academicTerms.terms.secondary.some(
      t => t.id.toLowerCase() === termId.toLowerCase()
    );

    // Skip terms not in the selected terms list
    const isTermSelected = normalizedSelectedTermIds.some(
      selectedId => selectedId.toLowerCase() === termId.toLowerCase()
    );
    if (!isTermSelected) {
      currentTermIndex = (currentTermIndex + 1) % academicTerms.ordering.length;
      if (currentTermIndex === 0 || termId === getAcademicYearEndTerm(academicTerms)) {
        currentYear++;
      }
      continue;
    }

    const termType = isPrimary ? 'primary' : 'secondary';
    const loadRange = termType === 'primary' ? loadRanges.primary : loadRanges.secondary;

    remainingCredits -= loadRange.target;
    totalTerms++;

    if (remainingCredits <= 0) {
      return {
        term: getTermLabel(termId, academicTerms),
        year: currentYear,
        termType,
        totalTerms,
      };
    }

    currentTermIndex = (currentTermIndex + 1) % academicTerms.ordering.length;
    if (currentTermIndex === 0 || termId === getAcademicYearEndTerm(academicTerms)) {
      currentYear++;
    }
  }

  throw new CreditDistributionError('Failed to estimate completion term');
}

/**
 * AUTHORIZATION: PUBLIC
 * Calculates target total credits based on course selection method
 * @param selectedCourses - Manually selected courses
 * @param selectedPrograms - Selected programs (majors, minors, gen ed)
 * @param usedPlaceholders - Whether user used placeholders (AI selection)
 * @returns Total credits to complete
 */
export function calculateTargetTotalCredits(
  selectedCourses: CourseSelection[],
  selectedPrograms: ProgramSelection[],
  usedPlaceholders: boolean
): number {
  if (!usedPlaceholders) {
    // Manual selection: sum of selected course credits
    return selectedCourses.reduce((sum, course) => sum + course.credits, 0);
  } else {
    // Placeholder/AI selection: sum of program requirements
    return selectedPrograms.reduce((sum, program) => {
      return sum + (program.target_total_credits || 0);
    }, 0);
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Generates chronological sequence of academic terms
 * @param startYear - Year of admission
 * @param startTerm - Term of admission (e.g., "Fall", "Winter")
 * @param endDate - Estimated graduation date
 * @param academicTerms - University's academic terms configuration
 * @param includeSecondary - Whether to include Spring/Summer terms
 * @returns Array of terms in chronological order
 */
export function generateTermSequence(
  startYear: number,
  startTerm: string,
  endDate: Date,
  academicTerms: AcademicTermsConfig,
  selectedTermIds: string[]
): Array<{ term: string; year: number; type: 'primary' | 'secondary' }> {
  const sequence: Array<{ term: string; year: number; type: 'primary' | 'secondary' }> = [];

  const endYear = endDate.getFullYear();

  // Find starting term index in ordering
  const startTermLower = startTerm.toLowerCase();
  let currentTermIndex = academicTerms.ordering.findIndex(
    term => term.toLowerCase() === startTermLower
  );

  if (currentTermIndex === -1) {
    throw new InvalidTermSequenceError(`Invalid start term: ${startTerm}`);
  }

  let currentYear = startYear;

  // Generate terms until we reach or pass the graduation date
  while (currentYear <= endYear) {
    const termId = academicTerms.ordering[currentTermIndex];

    // Determine if this is primary or secondary term
    const isPrimary = academicTerms.terms.primary.some(
      t => t.id.toLowerCase() === termId.toLowerCase()
    );
    const isSecondary = academicTerms.terms.secondary.some(
      t => t.id.toLowerCase() === termId.toLowerCase()
    );

    // Skip terms not in the selected terms list
    const isTermSelected = selectedTermIds.some(
      selectedId => selectedId.toLowerCase() === termId.toLowerCase()
    );
    if (!isTermSelected) {
      // Move to next term
      currentTermIndex = (currentTermIndex + 1) % academicTerms.ordering.length;
      if (currentTermIndex === 0 || termId === getAcademicYearEndTerm(academicTerms)) {
        currentYear++;
      }
      continue;
    }

    // Get term label
    const termLabel = getTermLabel(termId, academicTerms);

    sequence.push({
      term: termLabel,
      year: currentYear,
      type: isPrimary ? 'primary' : 'secondary',
    });

    // Check if we've reached graduation
    if (currentYear === endYear) {
      const termMonth = getTermMonth(termId, academicTerms);
      const gradMonth = endDate.getMonth();

      // If we've passed the graduation month, stop
      if (termMonth > gradMonth) {
        break;
      }
    }

    // Move to next term
    currentTermIndex = (currentTermIndex + 1) % academicTerms.ordering.length;

    // Increment year if we wrapped around or if this was the last term of academic year
    if (currentTermIndex === 0 || termId === getAcademicYearEndTerm(academicTerms)) {
      currentYear++;
    }
  }

  return sequence;
}

/**
 * AUTHORIZATION: PUBLIC
 * Validates that a credit distribution is feasible
 * @param distribution - Proposed semester allocations
 * @param selectedCourses - Courses that need to be scheduled
 * @returns Validation result with any errors
 */
export function validateCreditDistribution(
  distribution: SemesterAllocation[],
  selectedCourses: CourseSelection[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that total credits in distribution matches selected courses
  const totalAllocated = distribution.reduce(
    (sum, allocation) => sum + allocation.suggestedCredits,
    0
  );
  const totalRequired = selectedCourses.reduce(
    (sum, course) => sum + course.credits,
    0
  );

  if (Math.abs(totalAllocated - totalRequired) > 3) {
    errors.push(
      `Total allocated credits (${totalAllocated}) does not match required credits (${totalRequired})`
    );
  }

  // Check that all terms are within their min/max bounds
  distribution.forEach((allocation, index) => {
    if (allocation.suggestedCredits < allocation.minCredits) {
      errors.push(
        `Term ${index + 1} (${allocation.term}) has ${allocation.suggestedCredits} credits, below minimum of ${allocation.minCredits}`
      );
    }
    if (allocation.suggestedCredits > allocation.maxCredits) {
      errors.push(
        `Term ${index + 1} (${allocation.term}) has ${allocation.suggestedCredits} credits, above maximum of ${allocation.maxCredits}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

interface LoadRange {
  min: number;
  max: number;
  target: number;
}

interface StrategyLoadRanges {
  primary: LoadRange;
  secondary: LoadRange;
}

/**
 * Get credit load ranges for a given strategy
 */
function getStrategyLoadRanges(strategy: 'fast_track' | 'balanced' | 'explore'): StrategyLoadRanges {
  switch (strategy) {
    case 'fast_track':
      return {
        primary: { min: 15, max: 18, target: 16 },
        secondary: { min: 6, max: 9, target: 7 },
      };
    case 'balanced':
      return {
        primary: { min: 12, max: 18, target: 15 },
        secondary: { min: 3, max: 9, target: 6 },
      };
    case 'explore':
      return {
        primary: { min: 12, max: 15, target: 13 },
        secondary: { min: 3, max: 6, target: 4 },
      };
  }
}

/**
 * Redistribute remaining credits to earlier terms
 */
function redistributeRemainingCredits(
  allocations: SemesterAllocation[],
  remainingCredits: number
): void {
  let creditsToDistribute = remainingCredits;

  // Try to add to earlier primary terms that have room
  for (const allocation of allocations) {
    if (creditsToDistribute <= 0) break;

    const roomInTerm = allocation.maxCredits - allocation.suggestedCredits;
    if (roomInTerm > 0 && allocation.termType === 'primary') {
      const toAdd = Math.min(roomInTerm, creditsToDistribute);
      allocation.suggestedCredits += toAdd;
      creditsToDistribute -= toAdd;
    }
  }

  // If still have credits, try secondary terms
  for (const allocation of allocations) {
    if (creditsToDistribute <= 0) break;

    const roomInTerm = allocation.maxCredits - allocation.suggestedCredits;
    if (roomInTerm > 0 && allocation.termType === 'secondary') {
      const toAdd = Math.min(roomInTerm, creditsToDistribute);
      allocation.suggestedCredits += toAdd;
      creditsToDistribute -= toAdd;
    }
  }
}

/**
 * Get the label for a term (e.g., "Fall" for "fall")
 */
function getTermLabel(termId: string, academicTerms: AcademicTermsConfig): string {
  const allTerms = [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
  const term = allTerms.find(t => t.id.toLowerCase() === termId.toLowerCase());
  return term?.label || termId.charAt(0).toUpperCase() + termId.slice(1);
}

/**
 * Get the approximate month for a term (for comparison)
 */
function getTermMonth(termId: string, _academicTerms: AcademicTermsConfig): number {
  const termLower = termId.toLowerCase();

  // Approximate months for common terms
  const monthMap: Record<string, number> = {
    'fall': 8,      // September
    'winter': 0,    // January
    'spring': 4,    // May
    'summer': 5,    // June
    'autumn': 8,    // September
  };

  return monthMap[termLower] ?? 0;
}

/**
 * Get the last term of the academic year
 */
function getAcademicYearEndTerm(academicTerms: AcademicTermsConfig): string {
  const startIndex = academicTerms.ordering.findIndex(
    term => term.toLowerCase() === academicTerms.academic_year_start.toLowerCase()
  );

  if (startIndex === -1) return academicTerms.ordering[academicTerms.ordering.length - 1];

  // The term before the academic year start is the end of the previous year
  const endIndex = (startIndex - 1 + academicTerms.ordering.length) % academicTerms.ordering.length;
  return academicTerms.ordering[endIndex];
}

// ============================================================================
// Exports
// ============================================================================

export const GradPlanGenerationService = {
  calculateSemesterDistribution,
  estimateCompletionTerm,
  calculateTargetTotalCredits,
  generateTermSequence,
  validateCreditDistribution,
  getStrategyLoadRanges,
};

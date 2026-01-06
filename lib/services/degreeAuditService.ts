/**
 * Degree Audit Service
 *
 * Calculates how well a student's completed courses satisfy a program's requirements.
 * Uses requirements-based % completion (satisfied requirements / total requirements).
 *
 * AUTHORIZATION: PUBLIC (but typically used server-side)
 */

import type { ParsedCourse } from './userCoursesService';
import type { ProgramRow } from '@/types/program';
import type {
  ProgramRequirement,
  ProgramRequirementsStructure,
  RequirementType,
  Course as RequirementCourse,
  AllOfRequirement,
  ChooseNOfRequirement,
  CreditBucketRequirement,
  OptionGroupRequirement,
  SequenceRequirement,
  NoteOnlyRequirement,
} from '@/types/programRequirements';
import { getCourses, getSubRequirements } from '@/types/programRequirements';
import { matchCoursesToProgram } from './courseMatchingService';

// ============================================================================
// TYPES
// ============================================================================

export interface RequirementAuditResult {
  requirementId: string | number;
  description: string;
  type: RequirementType;
  satisfied: boolean;

  // Progress metrics
  satisfiedCount?: number;
  totalCount?: number;
  requiredCount?: number;  // For chooseNOf
  earnedCredits?: number;  // For creditBucket
  requiredCredits?: number;

  // Applied courses (course codes that satisfied this requirement)
  appliedCourses: string[];

  // All required courses (for showing what's missing)
  requiredCourses?: RequirementCourse[];

  // Nested results
  subResults?: RequirementAuditResult[];

  // Messages
  message?: string;
}

export interface ProgramAuditResult {
  program: ProgramRow;
  percentComplete: number;
  satisfiedCount: number;
  totalCount: number;
  results: RequirementAuditResult[];
  appliedCourseIds: string[];
  courseToRequirementMap: Map<string, string[]>;
}

// ============================================================================
// COURSE MATCHING HELPERS
// ============================================================================

/**
 * Normalizes a course code for comparison (removes spaces, hyphens, uppercase)
 */
function normalizeCourseCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Checks if a user course matches a requirement course
 * Supports exact match and wildcard match (e.g., "CS 1XX" matches "CS 142")
 */
function doesCourseMatch(userCourse: ParsedCourse, requirementCourse: RequirementCourse): boolean {
  // Try multiple formats
  const userCode1 = `${userCourse.subject}${userCourse.number}`;
  const userCode2 = `${userCourse.subject} ${userCourse.number}`;

  const normalizedUserCode1 = normalizeCourseCode(userCode1);
  const normalizedUserCode2 = normalizeCourseCode(userCode2);
  const normalizedReqCode = normalizeCourseCode(requirementCourse.code);

  // Exact match (both formats)
  if (normalizedUserCode1 === normalizedReqCode || normalizedUserCode2 === normalizedReqCode) {
    return true;
  }

  // Wildcard match: "CS 1XX" should match "CS 142"
  const reqCodeWithoutX = normalizedReqCode.replace(/X+$/g, '');
  if (reqCodeWithoutX && (normalizedUserCode1.startsWith(reqCodeWithoutX) || normalizedUserCode2.startsWith(reqCodeWithoutX))) {
    return true;
  }

  return false;
}

/**
 * Finds a user course that matches a requirement course
 */
function findMatchingUserCourse(
  userCourses: ParsedCourse[],
  requirementCourse: RequirementCourse
): ParsedCourse | undefined {
  return userCourses.find(uc => doesCourseMatch(uc, requirementCourse));
}

// ============================================================================
// REQUIREMENT EVALUATION
// ============================================================================

/**
 * Evaluates an 'allOf' requirement - must complete all courses/subrequirements
 */
function evaluateAllOf(
  req: AllOfRequirement,
  userCourses: ParsedCourse[]
): RequirementAuditResult {
  const courses = getCourses(req) || [];
  const subReqs = getSubRequirements(req) || [];

  // Match user courses to requirement courses
  const matchedCourses: string[] = [];
  for (const reqCourse of courses) {
    const matched = findMatchingUserCourse(userCourses, reqCourse);
    if (matched) {
      matchedCourses.push(reqCourse.code);
    }
  }

  // Recursively evaluate nested requirements
  const subResults = subReqs.map(sub => evaluateRequirement(sub, userCourses));

  const totalItems = courses.length + subReqs.length;
  const satisfiedItems = matchedCourses.length + subResults.filter(r => r.satisfied).length;

  return {
    requirementId: req.requirementId,
    description: req.description,
    type: 'allOf',
    satisfied: totalItems > 0 && satisfiedItems === totalItems,
    satisfiedCount: satisfiedItems,
    totalCount: totalItems,
    appliedCourses: matchedCourses,
    requiredCourses: courses,
    subResults: subResults.length > 0 ? subResults : undefined
  };
}

/**
 * Evaluates a 'chooseNOf' requirement - must complete N out of available options
 */
function evaluateChooseNOf(
  req: ChooseNOfRequirement,
  userCourses: ParsedCourse[]
): RequirementAuditResult {
  const n = req.constraints.n;
  const courses = getCourses(req) || [];
  const subReqs = getSubRequirements(req) || [];

  // Match user courses
  const matchedCourses: string[] = [];
  for (const reqCourse of courses) {
    const matched = findMatchingUserCourse(userCourses, reqCourse);
    if (matched) {
      matchedCourses.push(reqCourse.code);
    }
  }

  // Recursively evaluate subrequirements
  const subResults = subReqs.map(sub => evaluateRequirement(sub, userCourses));
  const satisfiedSubs = subResults.filter(r => r.satisfied);

  const totalSatisfied = matchedCourses.length + satisfiedSubs.length;

  return {
    requirementId: req.requirementId,
    description: req.description,
    type: 'chooseNOf',
    satisfied: totalSatisfied >= n,
    satisfiedCount: totalSatisfied,
    requiredCount: n,
    totalCount: courses.length + subReqs.length,
    appliedCourses: matchedCourses,
    requiredCourses: courses,
    subResults: subResults.length > 0 ? subResults : undefined
  };
}

/**
 * Evaluates a 'creditBucket' requirement - must accumulate minimum credits
 */
function evaluateCreditBucket(
  req: CreditBucketRequirement,
  userCourses: ParsedCourse[]
): RequirementAuditResult {
  const minCredits = req.constraints.minTotalCredits;
  const courses = getCourses(req) || [];
  const subReqs = getSubRequirements(req) || [];

  let earnedCredits = 0;
  const appliedCourses: string[] = [];

  // Sum credits from matching courses
  for (const reqCourse of courses) {
    const matched = findMatchingUserCourse(userCourses, reqCourse);
    if (matched) {
      earnedCredits += matched.credits || 0;
      appliedCourses.push(reqCourse.code);
    }
  }

  // Recursively evaluate subrequirements and sum their credits
  const subResults = subReqs.map(sub => evaluateRequirement(sub, userCourses));
  for (const subResult of subResults) {
    if (subResult.earnedCredits) {
      earnedCredits += subResult.earnedCredits;
    }
  }

  return {
    requirementId: req.requirementId,
    description: req.description,
    type: 'creditBucket',
    satisfied: earnedCredits >= minCredits,
    earnedCredits,
    requiredCredits: minCredits,
    appliedCourses,
    requiredCourses: courses,
    subResults: subResults.length > 0 ? subResults : undefined
  };
}

/**
 * Evaluates an 'optionGroup' requirement - choose one track
 * MVP: Cannot auto-detect which track student chose, mark as unsatisfied
 */
function evaluateOptionGroup(
  req: OptionGroupRequirement,
  _userCourses: ParsedCourse[]
): RequirementAuditResult {
  return {
    requirementId: req.requirementId,
    description: req.description,
    type: 'optionGroup',
    satisfied: false,
    message: 'Track selection not auto-detected (requires manual selection)',
    appliedCourses: []
  };
}

/**
 * Evaluates a 'sequence' requirement - courses in specific order
 * MVP: Ignore ordering, just check if all courses completed (treat as allOf)
 */
function evaluateSequence(
  req: SequenceRequirement,
  userCourses: ParsedCourse[]
): RequirementAuditResult {
  const allCourses = req.sequence.flatMap(seq => seq.courses);

  const matchedCourses: string[] = [];
  for (const reqCourse of allCourses) {
    const matched = findMatchingUserCourse(userCourses, reqCourse);
    if (matched) {
      matchedCourses.push(reqCourse.code);
    }
  }

  return {
    requirementId: req.requirementId,
    description: req.description,
    type: 'sequence',
    satisfied: matchedCourses.length === allCourses.length,
    satisfiedCount: matchedCourses.length,
    totalCount: allCourses.length,
    appliedCourses: matchedCourses,
    requiredCourses: allCourses
  };
}

/**
 * Evaluates a 'noteOnly' requirement - informational only, always satisfied
 */
function evaluateNoteOnly(
  req: NoteOnlyRequirement
): RequirementAuditResult {
  return {
    requirementId: req.requirementId,
    description: req.description,
    type: 'noteOnly',
    satisfied: true,
    appliedCourses: []
  };
}

/**
 * Infers requirement type from structure if type is missing
 * Also adds missing constraints (like n for chooseNOf)
 */
function inferRequirementType(req: ProgramRequirement): ProgramRequirement {
  // If type exists and has all needed fields, return as-is
  if (req.type && (req.type !== 'chooseNOf' || (req.constraints && 'n' in req.constraints))) {
    return req;
  }

  // Type inference based on structure
  const hasSteps = 'steps' in req && Array.isArray(req.steps);
  const hasCourses = 'courses' in req && Array.isArray(req.courses);
  const hasSubReqs = ('subRequirements' in req || 'subrequirements' in req);
  const hasConstraints = 'constraints' in req && req.constraints;

  // noteOnly: has steps, no courses
  if (hasSteps && !hasCourses) {
    return { ...req, type: 'noteOnly' };
  }

  // creditBucket: description contains "hours" or "credits" pattern
  const creditMatch = req.description.match(/(\d+(?:\.\d+)?)\s+(hours?|credits?)/i);
  if (creditMatch) {
    const minCredits = parseFloat(creditMatch[1]);
    return {
      ...req,
      type: 'creditBucket',
      constraints: { ...req.constraints, minTotalCredits: minCredits }
    };
  }

  // creditBucket: constraints with minTotalCredits
  if (hasConstraints && 'minTotalCredits' in req.constraints && typeof req.constraints.minTotalCredits === 'number') {
    return {
      ...req,
      type: 'creditBucket',
      constraints: { ...req.constraints, minTotalCredits: req.constraints.minTotalCredits }
    };
  }

  // chooseNOf: description contains "of" pattern like "Complete 3 of 19 Courses"
  const chooseMatch = req.description.match(/(\d+)\s+of\s+\d+/i);
  if (hasCourses && chooseMatch) {
    const n = parseInt(chooseMatch[1], 10);
    return {
      ...req,
      type: 'chooseNOf',
      constraints: { ...req.constraints, n }
    };
  }

  // allOf: has courses or subrequirements, default assumption
  if (hasCourses || hasSubReqs) {
    return { ...req, type: 'allOf' };
  }

  // Default to noteOnly
  return { ...req, type: 'noteOnly' };
}

/**
 * Evaluates a single requirement based on its type
 */
function evaluateRequirement(
  requirement: ProgramRequirement,
  userCourses: ParsedCourse[]
): RequirementAuditResult {
  // Infer type and constraints if missing
  const req = inferRequirementType(requirement);

  switch (req.type) {
    case 'allOf':
      return evaluateAllOf(req as AllOfRequirement, userCourses);
    case 'chooseNOf':
      return evaluateChooseNOf(req as ChooseNOfRequirement, userCourses);
    case 'creditBucket':
      return evaluateCreditBucket(req as CreditBucketRequirement, userCourses);
    case 'optionGroup':
      return evaluateOptionGroup(req as OptionGroupRequirement, userCourses);
    case 'sequence':
      return evaluateSequence(req as SequenceRequirement, userCourses);
    case 'noteOnly':
      return evaluateNoteOnly(req as NoteOnlyRequirement);
    default: {
      // Unknown type, mark as unsatisfied (defensive programming)
      // TypeScript thinks this is unreachable, but we handle it anyway
      const unknownReq = req as ProgramRequirement;
      return {
        requirementId: unknownReq.requirementId,
        description: unknownReq.description,
        type: unknownReq.type,
        satisfied: false,
        message: `Unknown requirement type: ${unknownReq.type}`,
        appliedCourses: []
      };
    }
  }
}

// ============================================================================
// OVERALL COMPLETION CALCULATION
// ============================================================================

/**
 * Recursively counts all requirements in a requirement tree
 */
function countAllRequirements(reqs: ProgramRequirement[]): number {
  let count = 0;

  for (const req of reqs) {
    count++; // Count this requirement

    // Count nested subrequirements
    const subs = getSubRequirements(req);
    if (subs && subs.length > 0) {
      count += countAllRequirements(subs);
    }

    // Count option group tracks
    if (req.type === 'optionGroup') {
      for (const option of req.options) {
        count += countAllRequirements(option.requirements);
      }
    }
  }

  return count;
}

/**
 * Recursively counts satisfied requirements in audit results
 */
function countSatisfiedRequirements(results: RequirementAuditResult[]): number {
  let count = 0;

  for (const result of results) {
    if (result.satisfied) {
      count++;
    }

    // Count nested satisfied requirements
    if (result.subResults && result.subResults.length > 0) {
      count += countSatisfiedRequirements(result.subResults);
    }
  }

  return count;
}

/**
 * Recursively counts total course slots needed across all requirements
 * For allOf: counts all courses
 * For chooseNOf: counts all courses (since student could pick any N)
 * For creditBucket: counts all available courses
 */
function countTotalCourseSlots(results: RequirementAuditResult[]): number {
  let total = 0;

  for (const result of results) {
    // Count courses at this level based on requirement type
    if (result.type === 'allOf' && result.totalCount !== undefined) {
      // For allOf, we need to satisfy all items
      total += result.totalCount;
    } else if (result.type === 'chooseNOf' && result.requiredCount !== undefined) {
      // For chooseNOf, we only need N courses
      total += result.requiredCount;
    } else if (result.totalCount !== undefined) {
      // Other types with totalCount
      total += result.totalCount;
    }

    // Don't recurse into subrequirements - the totalCount already includes them
    // (allOf with 3 courses + 2 subreqs has totalCount = 5)
  }

  return total;
}

/**
 * Recursively counts satisfied course slots across all requirements
 */
function countSatisfiedCourseSlots(results: RequirementAuditResult[]): number {
  let satisfied = 0;

  for (const result of results) {
    // Count satisfied courses at this level
    if (result.satisfiedCount !== undefined) {
      satisfied += result.satisfiedCount;
    }

    // Don't recurse - satisfiedCount already includes nested requirements
  }

  return satisfied;
}

/**
 * Calculates overall % completion based on courses satisfied
 */
function calculateOverallCompletion(
  requirements: ProgramRequirement[],
  results: RequirementAuditResult[]
): { percentComplete: number; satisfiedCount: number; totalCount: number } {
  const totalRequirements = countAllRequirements(requirements);
  const satisfiedRequirements = countSatisfiedRequirements(results);

  // Course-based % completion (more granular)
  const totalCourseSlots = countTotalCourseSlots(results);
  const satisfiedCourseSlots = countSatisfiedCourseSlots(results);

  const percentComplete = totalCourseSlots > 0
    ? Math.min(100, Math.round((satisfiedCourseSlots / totalCourseSlots) * 100))
    : 0;

  return {
    percentComplete,
    satisfiedCount: satisfiedRequirements, // Requirements satisfied (for display)
    totalCount: totalRequirements // Total requirements (for display)
  };
}

// ============================================================================
// COURSE MAPPING
// ============================================================================

/**
 * Builds a map of course ID -> requirement IDs that the course satisfies
 */
function buildCourseToRequirementMap(
  userCourses: ParsedCourse[],
  results: RequirementAuditResult[],
  parentId = ''
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  function processResult(result: RequirementAuditResult, path: string) {
    const reqId = path ? `${path}.${result.requirementId}` : String(result.requirementId);

    // For each applied course in this result, add this requirement ID
    for (const courseCode of result.appliedCourses) {
      // Find the user course by code
      const userCourse = userCourses.find(uc => {
        const ucCode = `${uc.subject} ${uc.number}`;
        return normalizeCourseCode(ucCode) === normalizeCourseCode(courseCode) ||
               normalizeCourseCode(`${uc.subject}${uc.number}`) === normalizeCourseCode(courseCode);
      });

      if (userCourse && userCourse.id) {
        const existing = map.get(userCourse.id) || [];
        if (!existing.includes(reqId)) {
          existing.push(reqId);
          map.set(userCourse.id, existing);
        }
      }
    }

    // Process nested results
    if (result.subResults) {
      for (const subResult of result.subResults) {
        processResult(subResult, reqId);
      }
    }
  }

  for (const result of results) {
    processResult(result, parentId);
  }

  return map;
}

/**
 * Extracts all applied course IDs from audit results
 */
function extractAppliedCourseIds(
  userCourses: ParsedCourse[],
  results: RequirementAuditResult[]
): string[] {
  const courseIds = new Set<string>();

  console.log(`📝 Extracting course IDs from ${results.length} results`);
  console.log(`📝 Sample user courses:`, userCourses.slice(0, 3).map(c => ({
    id: c.id,
    subject: c.subject,
    number: c.number,
    code: `${c.subject} ${c.number}`
  })));

  function processResult(result: RequirementAuditResult) {
    console.log(`  Processing result: ${result.description}, applied courses: ${result.appliedCourses.length}`);

    for (const courseCode of result.appliedCourses) {
      const userCourse = userCourses.find(uc => {
        const ucCode = `${uc.subject} ${uc.number}`;
        const match = normalizeCourseCode(ucCode) === normalizeCourseCode(courseCode) ||
               normalizeCourseCode(`${uc.subject}${uc.number}`) === normalizeCourseCode(courseCode);

        if (match) {
          console.log(`    Found match: ${ucCode} (ID: ${uc.id}) matches ${courseCode}`);
        }
        return match;
      });

      if (userCourse) {
        // Use ID if available, otherwise create a fallback ID
        const courseId = userCourse.id || `${userCourse.subject}_${userCourse.number}`;
        courseIds.add(courseId);

        if (!userCourse.id) {
          console.warn(`    ⚠️ Course matched but has no ID, using fallback: ${courseId}`);
        }
      } else {
        console.warn(`    ⚠️ No match found for requirement course: ${courseCode}`);
      }
    }

    if (result.subResults) {
      for (const subResult of result.subResults) {
        processResult(subResult);
      }
    }
  }

  for (const result of results) {
    processResult(result);
  }

  console.log(`📝 Extracted ${courseIds.size} unique course IDs`);
  return Array.from(courseIds);
}

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

/**
 * Audits a program to determine how well the student's courses satisfy requirements
 *
 * @param userCourses - Student's completed courses
 * @param program - Program to audit against
 * @returns Audit result with % completion and detailed requirement satisfaction
 */
export async function auditProgram(
  userCourses: ParsedCourse[],
  program: ProgramRow
): Promise<ProgramAuditResult> {
  console.log(`🔍 Auditing program: ${program.name}`);
  console.log(`📚 User has ${userCourses.length} courses`);

  // Parse program requirements
  let requirementsStructure: ProgramRequirementsStructure | null = null;

  try {
    if (program.requirements && typeof program.requirements === 'object') {
      requirementsStructure = program.requirements as ProgramRequirementsStructure;
    }
  } catch (error) {
    console.error('Failed to parse program requirements:', error);
  }

  if (!requirementsStructure || !requirementsStructure.programRequirements) {
    console.log(`⚠️ No valid requirements found for ${program.name}`);
    // No valid requirements, return 0% completion
    return {
      program,
      percentComplete: 0,
      satisfiedCount: 0,
      totalCount: 0,
      results: [],
      appliedCourseIds: [],
      courseToRequirementMap: new Map()
    };
  }

  console.log(`📋 Found ${requirementsStructure.programRequirements.length} top-level requirements`);

  // Evaluate each top-level requirement
  const results = requirementsStructure.programRequirements.map(req =>
    evaluateRequirement(req, userCourses)
  );

  // Calculate overall completion
  const { percentComplete, satisfiedCount, totalCount } = calculateOverallCompletion(
    requirementsStructure.programRequirements,
    results
  );

  // Build course-to-requirement mapping
  const courseToRequirementMap = buildCourseToRequirementMap(userCourses, results);

  // Extract all applied course IDs
  const appliedCourseIds = extractAppliedCourseIds(userCourses, results);

  console.log(`✅ Audit complete: ${satisfiedCount}/${totalCount} requirements (${percentComplete}%)`);
  console.log(`📊 ${appliedCourseIds.length} courses applied to requirements`);

  return {
    program,
    percentComplete,
    satisfiedCount,
    totalCount,
    results,
    appliedCourseIds,
    courseToRequirementMap
  };
}

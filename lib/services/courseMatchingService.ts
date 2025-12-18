/**
 * Course Matching Service
 * Matches user courses to program requirements
 */

import type { CourseFulfillment, ParsedCourse } from './userCoursesService';
import { MAX_COURSE_FULFILLMENTS } from './userCoursesService';
import type { ProgramRow } from '@/types/program';
import type {
  ProgramRequirement,
  ProgramRequirementsStructure,
  Course as RequirementCourse,
  RequirementType,
} from '@/types/programRequirements';
import { getCourses, getSubRequirements } from '@/types/programRequirements';

export interface MatchedCourse extends ParsedCourse {
  matchedRequirements: string[]; // Requirement IDs this course matches
}

export interface ProgramWithMatches {
  program: ProgramRow;
  matchedCourses: MatchedCourse[];
  unmatchedCourses: ParsedCourse[];
}

export interface RequirementOption {
  programId: string;
  programName: string;
  requirementId: string;
  requirementDescription: string;
  requirementType: RequirementType | string;
}

export interface GenEdMatchResult {
  course: ParsedCourse;
  matchedRequirements: CourseFulfillment[];
  availableRequirements: RequirementOption[];
}

interface FlattenedRequirementCourse {
  program: ProgramRow;
  course: RequirementCourse;
  requirementId: string;
  requirementDescription: string;
  requirementType: RequirementType;
}

/**
 * Normalizes a course code for comparison (removes spaces, hyphens, converts to uppercase)
 */
function normalizeCourseCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Extracts subject code from a course code (the part before the space/number)
 * E.g., "CS 142" -> "CS", "MATH 110" -> "MATH", "CS-142" -> "CS"
 */
function extractSubject(code: string): string {
  // Match letters at the start, up to 4 characters
  const match = code.match(/^([A-Z]{1,4})/i);
  return match ? match[1].toUpperCase() : '';
}

/**
 * Checks if a user course matches a requirement course
 * Now supports multiple matching strategies:
 * 1. Exact match (e.g., "CS 142" === "CS 142")
 * 2. Partial match with wildcards (e.g., "CS 1XX" matches "CS 142")
 * 3. Subject-only match (e.g., "CS 142" matches any "CS XXX" requirement)
 */
function doesCourseMatch(userCourseCode: string, requirementCourse: RequirementCourse, allowSubjectMatch = false): boolean {
  const normalizedUserCode = normalizeCourseCode(userCourseCode);
  const normalizedReqCode = normalizeCourseCode(requirementCourse.code);

  // Exact match
  if (normalizedUserCode === normalizedReqCode) {
    return true;
  }

  // Partial match: Check if requirement code contains wildcards or is a prefix
  // E.g., "CS 1XX" or "CS 1" should match "CS 142"
  const reqCodeWithoutX = normalizedReqCode.replace(/X+$/g, '');
  if (reqCodeWithoutX && normalizedUserCode.startsWith(reqCodeWithoutX)) {
    return true;
  }

  // Subject-only match (for Gen Ed or flexible requirements)
  // This is very lenient - any course with matching subject code qualifies
  if (allowSubjectMatch) {
    const userSubject = extractSubject(userCourseCode).trim().toUpperCase();
    const reqSubject = extractSubject(requirementCourse.code).trim();

    // Match if both have the same subject code (2-4 letters)
    if (userSubject && reqSubject && userSubject === reqSubject) {
      return true;
    }

    // Also try matching against the normalized requirement code prefix
    // This handles cases where the requirement might be formatted differently
    const reqPrefix = normalizedReqCode.replace(/[0-9X]+$/g, '').trim();
    if (userSubject && reqPrefix && userSubject === reqPrefix) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively extracts all requirement courses from a program requirement structure
 */
function extractRequirementCourses(
  requirement: ProgramRequirement,
  requirementPath: string = ''
): Array<{ course: RequirementCourse; requirementId: string; requirementDescription: string; requirementType: RequirementType }> {
  const results: Array<{ course: RequirementCourse; requirementId: string; requirementDescription: string; requirementType: RequirementType }> = [];
  const currentPath = requirementPath
    ? `${requirementPath}.${requirement.requirementId}`
    : String(requirement.requirementId);
  const requirementDescription = requirement.description || `Requirement ${currentPath}`;

  // Get courses from this requirement
  const courses = getCourses(requirement);
  if (courses) {
    console.log(`  📚 Found ${courses.length} courses in requirement ${currentPath} (${requirementDescription})`);
    courses.forEach((course) => {
      results.push({
        course,
        requirementId: currentPath,
        requirementDescription,
        requirementType: requirement.type,
      });
    });
  }

  // Handle option groups (tracks)
  if (requirement.type === 'optionGroup') {
    requirement.options.forEach((option) => {
      option.requirements.forEach((subReq) => {
        results.push(...extractRequirementCourses(subReq, `${currentPath}.${option.trackId}`));
      });
    });
  }

  // Handle sequences
  if (requirement.type === 'sequence') {
    requirement.sequence.forEach((seq) => {
      seq.courses.forEach((course) => {
        results.push({ course, requirementId: `${currentPath}.${seq.sequenceId}` });
      });
    });
  }

  // Handle nested sub-requirements
  const subRequirements = getSubRequirements(requirement);
  if (subRequirements) {
    subRequirements.forEach((subReq) => {
      results.push(...extractRequirementCourses(subReq, currentPath));
    });
  }

  return results;
}

function parseProgramRequirementsStructure(program: ProgramRow): ProgramRequirementsStructure | null {
  if (!program.requirements) {
    return null;
  }

  try {
    if (typeof program.requirements === 'string') {
      return JSON.parse(program.requirements) as ProgramRequirementsStructure;
    }
    if (typeof program.requirements === 'object' && program.requirements !== null) {
      const candidate = program.requirements as ProgramRequirementsStructure;
      if (Array.isArray(candidate.programRequirements)) {
        return candidate;
      }
    }
  } catch (error) {
    console.error('Failed to parse program requirements:', error);
  }

  return null;
}

export interface MatchingOptions {
  allowSubjectMatch?: boolean;
}

/**
 * Matches user courses to a program's requirements
 */
export function matchCoursesToProgram(
  userCourses: ParsedCourse[],
  program: ProgramRow,
  options: MatchingOptions = {}
): ProgramWithMatches {
  const { allowSubjectMatch = false } = options;
  const matchedCourses: MatchedCourse[] = [];
  const unmatchedCourses: ParsedCourse[] = [];

  console.log(`🔍 Matching courses to program: ${program.name}`);
  console.log(`📚 User has ${userCourses.length} courses to match`);
  console.log(`🎯 Match mode: ${allowSubjectMatch ? 'Subject-only matching ENABLED' : 'Exact/wildcard matching only'}`);

  // Parse program requirements
  const requirementsStructure = parseProgramRequirementsStructure(program);

  if (!requirementsStructure || !requirementsStructure.programRequirements) {
    console.log(`⚠️ No valid requirements found for ${program.name}`);
    // No valid requirements, all courses are unmatched
    return {
      program,
      matchedCourses: [],
      unmatchedCourses: userCourses,
    };
  }

  // Extract all requirement courses
  const allRequirementCourses = requirementsStructure.programRequirements.flatMap((req) =>
    extractRequirementCourses(req)
  );

  console.log(`📋 Found ${allRequirementCourses.length} requirement courses in ${program.name}`);
  if (allRequirementCourses.length > 0) {
    console.log(`   Sample requirements: ${allRequirementCourses.slice(0, 5).map(r => r.course.code).join(', ')}`);

    if (allowSubjectMatch) {
      // Show unique subjects found in Gen Ed requirements
      const uniqueSubjects = new Set(
        allRequirementCourses.map(r => extractSubject(r.course.code)).filter(s => s.length > 0)
      );
      console.log(`   📚 Gen Ed subjects available: ${Array.from(uniqueSubjects).sort().join(', ')}`);
    }
  }

  // Match each user course
  userCourses.forEach((userCourse) => {
    const userCode = `${userCourse.subject} ${userCourse.number}`;
    const matches = allRequirementCourses.filter(({ course }) =>
      doesCourseMatch(`${userCourse.subject} ${userCourse.number}`, course, allowSubjectMatch)
    );

    if (matches.length > 0) {
      console.log(`✅ Matched: ${userCode} -> ${matches.map(m => m.course.code).join(', ')}`);
      matchedCourses.push({
        ...userCourse,
        matchedRequirements: matches.map((m) => m.requirementId),
      });
    } else {
      if (allowSubjectMatch) {
        // Extra debugging for Gen Ed when no match found
        console.log(`❌ No match for: ${userCode} (subject: "${userCourse.subject}")`);
      }
      unmatchedCourses.push(userCourse);
    }
  });

  console.log(`✅ ${matchedCourses.length} matched, ❌ ${unmatchedCourses.length} unmatched for ${program.name}`);

  return {
    program,
    matchedCourses,
    unmatchedCourses,
  };
}

/**
 * Matches user courses to multiple programs
 */
export function matchCoursesToPrograms(
  userCourses: ParsedCourse[],
  programs: ProgramRow[]
): ProgramWithMatches[] {
  return programs.map((program) => matchCoursesToProgram(userCourses, program));
}

function collectRequirementOptions(
  program: ProgramRow,
  requirement: ProgramRequirement,
  path: string,
  target: RequirementOption[],
  seen: Set<string>
) {
  const currentPath = path ? `${path}.${requirement.requirementId}` : String(requirement.requirementId);
  const key = `${program.id}:${currentPath}`;

  if (!seen.has(key)) {
    target.push({
      programId: program.id,
      programName: program.name,
      requirementId: currentPath,
      requirementDescription: requirement.description || `Requirement ${currentPath}`,
      requirementType: requirement.type,
    });
    seen.add(key);
  }

  if (requirement.type === 'optionGroup') {
    requirement.options.forEach((option) => {
      option.requirements.forEach((subReq) => {
        collectRequirementOptions(program, subReq, `${currentPath}.${option.trackId}`, target, seen);
      });
    });
  }

  const subRequirements = getSubRequirements(requirement);
  if (subRequirements) {
    subRequirements.forEach((subReq) => collectRequirementOptions(program, subReq, currentPath, target, seen));
  }
}

export function extractRequirementOptions(genEdPrograms: ProgramRow[]): RequirementOption[] {
  const options: RequirementOption[] = [];
  const seen = new Set<string>();

  genEdPrograms.forEach((program) => {
    const structure = parseProgramRequirementsStructure(program);
    if (!structure?.programRequirements) {
      return;
    }

    structure.programRequirements.forEach((requirement) => {
      collectRequirementOptions(program, requirement, '', options, seen);
    });
  });

  return options;
}

export function performGenEdMatching(
  userCourses: ParsedCourse[],
  genEdPrograms: ProgramRow[]
): GenEdMatchResult[] {
  console.log('🔬 performGenEdMatching called with:', {
    userCoursesCount: userCourses?.length || 0,
    genEdProgramsCount: genEdPrograms?.length || 0,
    userCoursesIsArray: Array.isArray(userCourses),
    genEdProgramsIsArray: Array.isArray(genEdPrograms),
  });

  if (!Array.isArray(userCourses) || userCourses.length === 0) {
    console.log('⚠️ EARLY RETURN: No user courses or not an array');
    return [];
  }

  const availableRequirements = extractRequirementOptions(genEdPrograms);
  console.log('📋 Extracted', availableRequirements.length, 'requirement options');

  if (!Array.isArray(genEdPrograms) || genEdPrograms.length === 0) {
    console.log('⚠️ EARLY RETURN: No gen ed programs or not an array. Returning courses with empty matches.');
    return userCourses.map((course) => ({
      course,
      matchedRequirements: course.fulfillsRequirements ?? [],
      availableRequirements,
    }));
  }

  console.log('✅ Proceeding with matching logic...');

  const flattenedRequirements: FlattenedRequirementCourse[] = genEdPrograms.flatMap((program) => {
    console.log(`📖 Processing program: ${program.name} (ID: ${program.id})`);
    const structure = parseProgramRequirementsStructure(program);
    if (!structure?.programRequirements) {
      console.log(`  ⚠️ No valid requirements structure for ${program.name}`);
      return [];
    }

    const entries = structure.programRequirements.flatMap((requirement) => extractRequirementCourses(requirement));
    console.log(`  ✅ Extracted ${entries.length} requirement courses from ${program.name}`);
    if (entries.length > 0) {
      console.log(`     Sample courses: ${entries.slice(0, 3).map(e => e.course.code).join(', ')}`);
    }

    return entries.map((entry) => ({
      program,
      course: entry.course,
      requirementId: entry.requirementId,
      requirementDescription: entry.requirementDescription,
      requirementType: entry.requirementType,
    }));
  });

  console.log(`📊 Total flattened requirements: ${flattenedRequirements.length}`);

  return userCourses.map((course) => {
    const hasManualOverrides = course.fulfillsRequirements?.some((fulfillment) => fulfillment.matchType === 'manual');

    if (hasManualOverrides) {
      return {
        course,
        matchedRequirements: course.fulfillsRequirements ?? [],
        availableRequirements,
      };
    }

    if (flattenedRequirements.length === 0) {
      return {
        course,
        matchedRequirements: [],
        availableRequirements,
      };
    }

    const codesToTry: Array<{ code: string; isEquivalent: boolean }> = [];
    const canonicalCode = `${course.subject} ${course.number}`.trim();
    if (canonicalCode) {
      codesToTry.push({ code: canonicalCode, isEquivalent: true });
    }
    if (course.origin === 'transfer' && course.transfer) {
      const originalCode = `${course.transfer.originalSubject} ${course.transfer.originalNumber}`.trim();
      if (originalCode) {
        codesToTry.push({ code: originalCode, isEquivalent: false });
      }
    }

    const matchedFulfillments: CourseFulfillment[] = [];
    const usedRequirements = new Set<string>();

    flattenedRequirements.some((requirementEntry) => {
      const matchedCandidate = codesToTry.find((candidate) =>
        doesCourseMatch(candidate.code, requirementEntry.course, true)
      );

      if (!matchedCandidate) {
        return false;
      }

      const requirementKey = `${requirementEntry.program.id}:${requirementEntry.requirementId}`;
      if (usedRequirements.has(requirementKey)) {
        return false;
      }

      matchedFulfillments.push({
        programId: requirementEntry.program.id,
        programName: requirementEntry.program.name,
        requirementId: requirementEntry.requirementId,
        requirementDescription: requirementEntry.requirementDescription,
        matchType: 'auto',
        matchedAt: new Date().toISOString(),
        matchedCourseCode: matchedCandidate.isEquivalent ? undefined : matchedCandidate.code,
        requirementType: requirementEntry.requirementType,
      });
      usedRequirements.add(requirementKey);

      return matchedFulfillments.length >= MAX_COURSE_FULFILLMENTS;
    });

    const courseWithMatches: ParsedCourse =
      matchedFulfillments.length > 0
        ? {
            ...course,
            fulfillsRequirements: matchedFulfillments,
          }
        : {
            ...course,
            fulfillsRequirements: undefined,
          };

    return {
      course: courseWithMatches,
      matchedRequirements: matchedFulfillments,
      availableRequirements,
    };
  });
}

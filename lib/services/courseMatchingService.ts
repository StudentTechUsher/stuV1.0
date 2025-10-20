/**
 * Course Matching Service
 * Matches user courses to program requirements
 */

import type { ParsedCourse } from './userCoursesService';
import type { ProgramRow } from '@/types/program';
import type {
  ProgramRequirement,
  ProgramRequirementsStructure,
  Course as RequirementCourse,
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
function doesCourseMatch(userCourse: ParsedCourse, requirementCourse: RequirementCourse, allowSubjectMatch = false): boolean {
  const userCode = `${userCourse.subject}${userCourse.number}`;
  const normalizedUserCode = normalizeCourseCode(userCode);
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
    const userSubject = userCourse.subject.toUpperCase().trim();
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
): Array<{ course: RequirementCourse; requirementId: string }> {
  const results: Array<{ course: RequirementCourse; requirementId: string }> = [];
  const currentPath = requirementPath
    ? `${requirementPath}.${requirement.requirementId}`
    : String(requirement.requirementId);

  // Get courses from this requirement
  const courses = getCourses(requirement);
  if (courses) {
    courses.forEach((course) => {
      results.push({ course, requirementId: currentPath });
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
      doesCourseMatch(userCourse, course, allowSubjectMatch)
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

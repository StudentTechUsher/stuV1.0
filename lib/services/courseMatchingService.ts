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
 * Extracts subject code from a course code (the part before the number)
 * E.g., "CS 142" -> "CS", "MATH 110" -> "MATH", "M COM 320" -> "MCOM", "REL A 275" -> "RELA"
 * Handles subjects with spaces by removing them for comparison
 */
function extractSubject(code: string): string {
  // Remove spaces and extract letters before the first digit
  const normalized = code.replace(/[\s-]/g, '');
  const match = normalized.match(/^([A-Z]+)/i);
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
    // Normalize both subjects by removing spaces for comparison
    // "M COM" -> "MCOM", "REL A" -> "RELA", etc.
    const userSubject = userCourse.subject.replace(/\s/g, '').toUpperCase();
    const reqSubject = extractSubject(requirementCourse.code);

    // Match if both have the same normalized subject code
    if (userSubject && reqSubject && userSubject === reqSubject) {
      return true;
    }

    // Also try matching with the full user course code (handles edge cases)
    const userCodeSubject = extractSubject(`${userCourse.subject}${userCourse.number}`);
    if (userCodeSubject && reqSubject && userCodeSubject === reqSubject) {
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

  // Parse program requirements - handle both formats
  let requirementsArray: ProgramRequirement[] = [];

  try {
    if (program.requirements && typeof program.requirements === 'object') {
      const reqsObj = program.requirements as { programRequirements?: ProgramRequirement[]; [key: string]: unknown };

      // Standard format: {programRequirements: [...]}
      if (reqsObj.programRequirements && Array.isArray(reqsObj.programRequirements)) {
        requirementsArray = reqsObj.programRequirements;
        console.log(`📋 Using standard programRequirements format (${requirementsArray.length} requirements)`);
      }
      // Alternative format: Direct array with numeric keys ['0', '1', '2', ...]
      else {
        const keys = Object.keys(reqsObj);
        const numericKeys = keys.filter(k => /^\d+$/.test(k)).sort((a, b) => parseInt(a) - parseInt(b));

        if (numericKeys.length > 0) {
          requirementsArray = numericKeys.map(k => reqsObj[k] as ProgramRequirement);
          console.log(`📋 Using alternative array format with numeric keys (${requirementsArray.length} requirements)`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse program requirements:', error);
  }

  if (requirementsArray.length === 0) {
    console.log(`⚠️ No valid requirements found for ${program.name}`);
    // No valid requirements, all courses are unmatched
    return {
      program,
      matchedCourses: [],
      unmatchedCourses: userCourses,
    };
  }

  // Extract all requirement courses
  const allRequirementCourses = requirementsArray.flatMap((req) =>
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

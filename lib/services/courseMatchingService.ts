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
    const reqSubject = extractSubject(requirementCourse.code).trim().toUpperCase();

    // Match if both have the same normalized subject code
    if (userSubject && reqSubject && userSubject === reqSubject) {
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
        results.push({
          course,
          requirementId: `${currentPath}.${seq.sequenceId}`,
          requirementDescription,
          requirementType: requirement.type,
        });
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

/**
 * Converts a gen ed requirement object to ProgramRequirement format
 */
function convertGenEdToProgramRequirement(genEdReq: Record<string, unknown>, index: number): ProgramRequirement {
  // Extract the requirement info
  const subtitle = genEdReq.subtitle as string || `Requirement ${index + 1}`;
  const requirementObj = genEdReq.requirement as Record<string, unknown> | undefined;
  const requirementIndex = requirementObj?.index as number | undefined || index + 1;
  const blocks = genEdReq.blocks as unknown[] | undefined;

  // Create a ProgramRequirement that has the blocks structure
  // The getCourses() function will handle extracting courses from these blocks
  return {
    requirementId: requirementIndex,
    description: subtitle,
    type: 'allOf', // Gen eds are typically "complete all" requirements
    blocks: blocks, // Keep the blocks structure - getCourses() will parse it
  } as ProgramRequirement;
}

/**
 * Detects if requirements is in gen ed array format
 */
function isGenEdFormat(requirements: unknown): boolean {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return false;
  }

  // Check if first element has gen ed structure (subtitle, requirement, blocks)
  const first = requirements[0];
  if (typeof first !== 'object' || first === null) {
    return false;
  }

  const firstObj = first as Record<string, unknown>;
  return 'subtitle' in firstObj && 'requirement' in firstObj && 'blocks' in firstObj;
}

function parseProgramRequirementsStructure(program: ProgramRow): ProgramRequirementsStructure | null {
  if (!program.requirements) {
    return null;
  }

  try {
    let parsed: unknown;

    // Parse string requirements
    if (typeof program.requirements === 'string') {
      parsed = JSON.parse(program.requirements);
    } else {
      parsed = program.requirements;
    }

    // Check if it's already in the correct format (major requirements)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const candidate = parsed as ProgramRequirementsStructure;
      if (Array.isArray(candidate.programRequirements)) {
        console.log(`✅ Found major requirements structure with ${candidate.programRequirements.length} requirements`);
        return candidate;
      }
    }

    // Check if it's gen ed format (direct array)
    if (isGenEdFormat(parsed)) {
      const genEdArray = parsed as Record<string, unknown>[];
      console.log(`🔄 Converting ${genEdArray.length} gen ed requirements to standard format`);

      // Convert gen ed format to standard ProgramRequirementsStructure
      const programRequirements = genEdArray.map((genEdReq, index) =>
        convertGenEdToProgramRequirement(genEdReq, index)
      );

      return {
        programRequirements,
        metadata: {
          version: '1.0',
          lastModified: new Date().toISOString(),
        },
      };
    }

    console.warn('⚠️ Unknown requirements format:', parsed);
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

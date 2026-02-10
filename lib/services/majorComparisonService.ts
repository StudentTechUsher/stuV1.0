/**
 * Major Comparison Service
 *
 * Orchestrates comparison of multiple majors for a student, including:
 * - Degree audit for each major
 * - Double-counting detection (gen-ed + major overlap)
 * - Categorization of courses (that count, still needed, not used)
 *
 * AUTHORIZATION: PUBLIC (but typically used server-side)
 */

import type { ParsedCourse } from './userCoursesService';
import type { ProgramRow } from '@/types/program';
import type { Course as RequirementCourse } from '@/types/programRequirements';
import { auditProgram } from './degreeAuditService';
import type { RequirementAuditResult } from '@/types/degree-audit';
import { fetchProgramsBatch, GetGenEdsForUniversity } from './programService';
import { matchCoursesToProgram } from './courseMatchingService';
import type { CourseWithAnnotation, MajorComparisonResult } from '@/types/major-comparison';

// ============================================================================
// DOUBLE-COUNTING DETECTION
// ============================================================================

/**
 * Identifies courses that satisfy both major and gen-ed requirements
 */
async function identifyDoubleCounts(
  userCourses: ParsedCourse[],
  majorProgram: ProgramRow,
  genEdProgram: ProgramRow | null
): Promise<Map<string, { isDoubleCount: boolean; programs: string[] }>> {
  const doubleCounts = new Map<string, { isDoubleCount: boolean; programs: string[] }>();

  if (!genEdProgram) {
    console.log(`   ⚠️ No gen-ed program for double-count detection`);
    return doubleCounts;
  }

  // Match courses to major (exact/wildcard matching)
  const majorMatches = matchCoursesToProgram(userCourses, majorProgram);

  // Match courses to gen-ed (subject-only matching for flexibility)
  const genEdMatches = matchCoursesToProgram(userCourses, genEdProgram, {
    allowSubjectMatch: true
  });

  console.log(`   🔍 Double-count detection:`);
  console.log(`      Major matches: ${majorMatches.matchedCourses.length}`);
  console.log(`      Gen-Ed matches: ${genEdMatches.matchedCourses.length}`);

  // Find overlaps
  let doubleCountFound = 0;
  for (const course of userCourses) {
    if (!course.id) continue;

    const inMajor = majorMatches.matchedCourses.some(mc => mc.id === course.id);
    const inGenEd = genEdMatches.matchedCourses.some(mc => mc.id === course.id);

    if (inMajor && inGenEd) {
      doubleCounts.set(course.id, {
        isDoubleCount: true,
        programs: [majorProgram.name, genEdProgram.name]
      });
      doubleCountFound++;
      console.log(`      ✅ Double-count: ${course.subject} ${course.number}`);
    } else if (inMajor) {
      doubleCounts.set(course.id, {
        isDoubleCount: false,
        programs: [majorProgram.name]
      });
    }
  }

  console.log(`   📊 Found ${doubleCountFound} double-counting courses`);

  return doubleCounts;
}

// ============================================================================
// STILL NEEDED EXTRACTION
// ============================================================================

/**
 * Extracts courses/requirements that are still needed from audit results
 */
function extractUnmetRequirements(
  results: RequirementAuditResult[],
  allCourses: RequirementCourse[]
): RequirementCourse[] {
  const needed: RequirementCourse[] = [];
  const appliedCodesSet = new Set<string>();

  // Collect all applied course codes
  function collectApplied(results: RequirementAuditResult[]) {
    for (const result of results) {
      for (const code of result.appliedCourses) {
        appliedCodesSet.add(code.replace(/[\s-]/g, '').toUpperCase());
      }
      if (result.subResults) {
        collectApplied(result.subResults);
      }
    }
  }

  collectApplied(results);

  // Find courses not yet applied
  for (const course of allCourses) {
    const normalized = course.code.replace(/[\s-]/g, '').toUpperCase();
    if (!appliedCodesSet.has(normalized)) {
      needed.push(course);
    }
  }

  return needed;
}

/**
 * Recursively extracts all courses from requirements
 */
function extractAllCoursesFromRequirements(program: ProgramRow): RequirementCourse[] {
  const courses: RequirementCourse[] = [];

  try {
    const reqs = program.requirements as { programRequirements?: unknown[] };
    if (!reqs || !reqs.programRequirements) return courses;

    function extractCourses(req: { courses?: RequirementCourse[]; subRequirements?: unknown[]; subrequirements?: unknown[] }): void {
      if (req.courses) {
        courses.push(...req.courses);
      }
      const subs = req.subRequirements || req.subrequirements;
      if (subs && Array.isArray(subs)) {
        for (const sub of subs) {
          if (sub && typeof sub === 'object') {
            extractCourses(sub as { courses?: RequirementCourse[] });
          }
        }
      }
    }

    for (const req of reqs.programRequirements) {
      if (req && typeof req === 'object') {
        extractCourses(req as { courses?: RequirementCourse[] });
      }
    }
  } catch (error) {
    console.error('Error extracting courses from requirements:', error);
  }

  return courses;
}

// ============================================================================
// MAIN COMPARISON FUNCTION
// ============================================================================

/**
 * Compares multiple majors for a student
 *
 * @param userCourses - Student's completed courses
 * @param majorIds - Array of major program IDs to compare (2-4)
 * @param universityId - University ID for scoping
 * @returns Comparison results for each major
 */
export async function compareMajors(
  userCourses: ParsedCourse[],
  majorIds: string[],
  universityId: number
): Promise<{ success: boolean; comparisons?: MajorComparisonResult[]; error?: string }> {
  try {
    // 1. Fetch selected major programs
    const majors = await fetchProgramsBatch(majorIds, universityId);

    if (majors.length !== majorIds.length) {
      return {
        success: false,
        error: 'Some majors could not be found'
      };
    }

    // 2. Fetch gen-ed program for double-counting
    const genEdPrograms = await GetGenEdsForUniversity(universityId);
    const genEd = genEdPrograms.length > 0 ? genEdPrograms[0] : null;

    if (genEd) {
      console.log(`\n📚 Gen-Ed Program: ${genEd.name}`);
    }

    // 3. Audit each major
    const comparisons: MajorComparisonResult[] = [];

    for (const major of majors) {
      console.log(`\n🎯 Processing major: ${major.name}`);

      // Run degree audit
      const audit = await auditProgram(userCourses, major);

      console.log(`📊 Audit results: ${audit.appliedCourseIds.length} courses applied`);

      // Identify double-counts with gen-ed
      const doubleCounts = await identifyDoubleCounts(userCourses, major, genEd);

      // Annotate courses that count toward this major
      const coursesThatCount: CourseWithAnnotation[] = [];
      console.log(`📋 Building coursesThatCount from ${audit.appliedCourseIds.length} IDs`);

      for (const courseId of audit.appliedCourseIds) {
        // Match by ID or fallback to subject_number pattern
        const course = userCourses.find(c =>
          c.id === courseId ||
          `${c.subject}_${c.number}` === courseId
        );

        if (!course) {
          console.warn(`  ⚠️ Course ID ${courseId} not found in userCourses`);
          continue;
        }

        const dcInfo = doubleCounts.get(courseId);
        const reqIds = audit.courseToRequirementMap.get(courseId) || [];

        console.log(`  ✓ Adding: ${course.subject} ${course.number} (double-count: ${dcInfo?.isDoubleCount || false})`);

        coursesThatCount.push({
          course,
          isDoubleCount: dcInfo?.isDoubleCount || false,
          doubleCountsWith: dcInfo?.programs || [],
          satisfiesRequirements: reqIds
        });
      }

      console.log(`✅ Final coursesThatCount: ${coursesThatCount.length} courses`);


      // Extract still needed courses
      const allCourses = extractAllCoursesFromRequirements(major);
      const stillNeeded = extractUnmetRequirements(audit.results, allCourses);

      // Identify courses not used for this major
      const usedIds = new Set(audit.appliedCourseIds);
      const notUsed = userCourses.filter(c => c.id && !usedIds.has(c.id));

      comparisons.push({
        program: major,
        percentComplete: audit.percentComplete,
        requirementsSatisfied: audit.satisfiedCount,
        totalRequirements: audit.totalCount,
        coursesThatCount,
        stillNeeded,
        notUsed,
        auditDetails: audit.results
      });
    }

    return { success: true, comparisons };

  } catch (error) {
    console.error('Error comparing majors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

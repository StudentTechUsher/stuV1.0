/**
 * Utility functions for parsing and working with graduation plan data
 */

interface GradPlanCourse {
  code?: string;
  course_code?: string; // Support both formats
  title?: string | null;
  credits?: number;
  [key: string]: unknown;
}

interface GradPlanTerm {
  term: string;
  courses?: GradPlanCourse[];
  credits_planned?: number;
  [key: string]: unknown;
}

export interface GradPlanDetails {
  plan: GradPlanTerm[];
  [key: string]: unknown;
}

/**
 * Extracts courses for a specific term from grad plan details
 * @param planDetails - The graduation plan details
 * @param termIndexOrName - Either a term index (number) or term name (string)
 */
export function getCoursesForTerm(
  planDetails: GradPlanDetails | null | undefined,
  termIndexOrName: number | string
): { code: string; title: string; credits: number }[] {
  if (!planDetails?.plan) {
    console.warn('No plan details available');
    return [];
  }

  // Find the term by name or index
  let termData: GradPlanTerm | undefined;

  if (typeof termIndexOrName === 'string') {
    // Find by term name
    termData = planDetails.plan.find(term => term.term === termIndexOrName);
    console.log('getCoursesForTerm - searching by name:', termIndexOrName, 'found:', !!termData);
  } else {
    // Use index
    termData = planDetails.plan[termIndexOrName];
    console.log('getCoursesForTerm - using index:', termIndexOrName, 'term:', termData?.term);
  }

  if (!termData?.courses) {
    console.warn('No courses found for term:', termIndexOrName);
    return [];
  }

  const courses = termData.courses.map(course => {
    // Support both 'code' (grad plan format) and 'course_code' (alternative format)
    const courseCode = course.code || course.course_code || '';
    return {
      code: courseCode,
      title: course.title || courseCode,
      credits: course.credits || 3
    };
  });

  console.log('Extracted courses for term', termData.term, ':', courses);
  return courses;
}

/**
 * Calculates total credits for courses
 */
export function calculateTotalCredits(courses: { credits: number }[]): number {
  return courses.reduce((sum, course) => sum + course.credits, 0);
}

/**
 * Gets the term name for a specific index
 */
export function getTermName(
  planDetails: GradPlanDetails | null | undefined,
  termIndex: number
): string | null {
  if (!planDetails?.plan?.[termIndex]) {
    return null;
  }
  return planDetails.plan[termIndex].term;
}

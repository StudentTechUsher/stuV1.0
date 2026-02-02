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
 */
export function getCoursesForTerm(
  planDetails: GradPlanDetails | null | undefined,
  termIndex: number
): { code: string; title: string; credits: number }[] {
  if (!planDetails?.plan?.[termIndex]?.courses) {
    return [];
  }

  return planDetails.plan[termIndex].courses.map(course => {
    // Support both 'code' (grad plan format) and 'course_code' (alternative format)
    const courseCode = course.code || course.course_code || '';
    return {
      code: courseCode,
      title: course.title || courseCode,
      credits: course.credits || 3
    };
  });
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

import type { Term } from '@/components/grad-planner/types';

/**
 * Calculates if all courses in a term are marked as completed.
 * Returns false for empty terms or terms with no courses.
 *
 * @param term - The term to check
 * @returns true if ALL courses have isCompleted === true, false otherwise
 */
export function calculateTermCompletion(term: Term): boolean {
  if (!term.courses || term.courses.length === 0) {
    return false;
  }

  return term.courses.every(course => course.isCompleted === true);
}

/**
 * Enriches a term with completion metadata if not already present.
 * Returns a new term object with allCoursesCompleted field.
 *
 * @param term - The term to enrich
 * @returns Term with allCoursesCompleted field populated
 */
export function enrichTermWithCompletion(term: Term): Term {
  // If metadata already exists, return as-is
  if (term.allCoursesCompleted !== undefined) {
    return term;
  }

  // Calculate and add metadata
  return {
    ...term,
    allCoursesCompleted: calculateTermCompletion(term),
  };
}

/**
 * Counts how many courses in a term are completed.
 *
 * @param term - The term to check
 * @returns Object with completed and total course counts
 */
export function getTermCompletionStats(term: Term): {
  completed: number;
  total: number;
  percentComplete: number;
} {
  const total = term.courses?.length ?? 0;
  const completed = term.courses?.filter(course => course.isCompleted === true).length ?? 0;

  return {
    completed,
    total,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

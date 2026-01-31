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
 * Calculates if a term has already occurred (is in the past).
 * A term has passed if ALL courses have been attempted (have a status field).
 * This includes both completed and withdrawn courses.
 * Returns false for empty terms, planned terms, or terms with any future courses.
 *
 * @param term - The term to check
 * @returns true if ALL courses have status (Completed or Withdrawn), false otherwise
 */
export function calculateTermPassed(term: Term): boolean {
  if (!term.courses || term.courses.length === 0) {
    return false;
  }

  // A term has passed if all courses have a status (either Completed or Withdrawn)
  // Planned courses for future terms won't have a status field
  return term.courses.every(course =>
    course.status === 'Completed' || course.status === 'Withdrawn'
  );
}

/**
 * Enriches a term with completion metadata if not already present.
 * Returns a new term object with allCoursesCompleted and termPassed fields.
 *
 * @param term - The term to enrich
 * @returns Term with allCoursesCompleted and termPassed fields populated
 */
export function enrichTermWithCompletion(term: Term): Term {
  // If metadata already exists, return as-is
  if (term.allCoursesCompleted !== undefined && term.termPassed !== undefined) {
    return term;
  }

  // Calculate and add metadata
  return {
    ...term,
    allCoursesCompleted: calculateTermCompletion(term),
    termPassed: calculateTermPassed(term),
  };
}

/**
 * Counts how many courses in a term are completed vs withdrawn vs planned.
 *
 * @param term - The term to check
 * @returns Object with completion statistics
 */
export function getTermCompletionStats(term: Term): {
  completed: number;
  withdrawn: number;
  planned: number;
  total: number;
  percentComplete: number;
} {
  const total = term.courses?.length ?? 0;
  const completed = term.courses?.filter(course => course.isCompleted === true).length ?? 0;
  const withdrawn = term.courses?.filter(course => course.status === 'Withdrawn').length ?? 0;
  const planned = term.courses?.filter(course => !course.status).length ?? 0;

  return {
    completed,
    withdrawn,
    planned,
    total,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

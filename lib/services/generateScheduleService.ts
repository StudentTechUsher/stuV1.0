import { supabase } from '@/lib/supabase';
import { CourseSection } from './courseOfferingService';

// ---- Error Types ----
export class CourseOfferingFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseOfferingFetchError';
  }
}

/**
 * Normalizes term name for database queries
 * Removes words like "Semester" and "Term" to handle naming differences
 * between grad plan naming (e.g., "Fall Semester 2026") and
 * course_offerings naming (e.g., "Fall 2026")
 * Also ensures proper capitalization (e.g., "Fall 2026")
 */
function normalizeTermName(termName: string): string {
  return termName
    .replace(/\b(Semester|Term)\b/gi, '') // Remove "Semester" or "Term" (case-insensitive)
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim()                                // Remove leading/trailing spaces
    .split(' ')                            // Split into words
    .map(word => {
      // Capitalize first letter, lowercase the rest (except for years/numbers)
      if (/^\d+$/.test(word)) {
        return word; // Keep numbers as-is (e.g., "2026")
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');                            // Join back together
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Fetches course offerings for specified courses and term
 */
export async function fetchCourseOfferingsForTerm(
  universityId: number,
  termName: string,
  courseCodes: string[]
): Promise<CourseSection[]> {
  if (courseCodes.length === 0) {
    return [];
  }

  // Normalize the term name to handle differences in naming conventions
  const normalizedTermName = normalizeTermName(termName);

  const { data, error } = await supabase
    .from('course_offerings')
    .select('*')
    .eq('university_id', universityId)
    .eq('term_name', normalizedTermName)
    .in('course_code', courseCodes);

  if (error) {
    console.error('Failed to fetch course offerings:', error);
    throw new CourseOfferingFetchError('Failed to fetch offerings', error);
  }

  return (data || []) as CourseSection[];
}

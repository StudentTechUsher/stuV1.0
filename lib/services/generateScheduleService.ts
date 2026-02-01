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

  const { data, error } = await supabase
    .from('course_offerings')
    .select('*')
    .eq('university_id', universityId)
    .eq('term_name', termName)
    .in('course_code', courseCodes);

  if (error) {
    console.error('Failed to fetch course offerings:', error);
    throw new CourseOfferingFetchError('Failed to fetch offerings', error);
  }

  return (data || []) as CourseSection[];
}

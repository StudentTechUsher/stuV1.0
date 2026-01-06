'use server';

/**
 * Server Actions for Major Comparison
 *
 * Provides server-side data fetching for the Compare Majors feature:
 * - Fetch available majors for selection
 * - Fetch comparison results for selected majors
 */

import { compareMajors } from '@/lib/services/majorComparisonService';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';
import { GetMajorsForUniversity } from '@/lib/services/programService';
import { createServerSupabase } from '@/lib/supabaseServer';

/**
 * Fetches list of majors available for comparison at a university
 *
 * @param universityId - University ID
 * @returns List of majors with id and name
 */
export async function fetchMajorsForComparison(universityId: number) {
  try {
    const majors = await GetMajorsForUniversity(universityId);

    return {
      success: true,
      majors: majors.map(m => ({
        id: String(m.id),
        name: m.name
      }))
    };
  } catch (error) {
    console.error('Error fetching majors for comparison:', error);
    return {
      success: false,
      error: 'Failed to load majors. Please try again.'
    };
  }
}

/**
 * Fetches comparison data for selected majors
 *
 * @param args - majorIds (2-4 major IDs) and universityId
 * @returns Comparison results or error
 */
export async function fetchMajorComparison(args: {
  majorIds: string[];
  universityId: number;
}) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required. Please sign in.'
      };
    }

    // Validate input
    if (!args.majorIds || args.majorIds.length < 2 || args.majorIds.length > 4) {
      return {
        success: false,
        error: 'Please select between 2 and 4 majors to compare.'
      };
    }

    // Fetch user's courses
    const userCourses = await fetchUserCoursesArray(supabase, user.id);

    if (userCourses.length === 0) {
      return {
        success: false,
        error: 'No courses found. Please upload your transcript first to see accurate comparison results.'
      };
    }

    // Perform comparison
    const result = await compareMajors(userCourses, args.majorIds, args.universityId);

    return result;

  } catch (error) {
    console.error('Error in fetchMajorComparison:', error);
    return {
      success: false,
      error: 'Failed to compare majors. Please try again later.'
    };
  }
}

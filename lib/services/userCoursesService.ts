import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';

// Custom error types for better error handling
export class UserCourseFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'UserCourseFetchError';
  }
}

export class CourseUpsertError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseUpsertError';
  }
}

export interface ParsedCourse {
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
}

export interface UserCourse {
  id: string;
  user_id: string;
  inserted_at: string;
  courses: ParsedCourse[];
}

export interface FormattedCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  term: string;
  grade: string;
  tags: string[];
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches the user's course record (containing all courses as JSON)
 * @param userId - The user ID
 * @returns UserCourse record or null if not found
 */
export async function fetchUserCourses(userId: string): Promise<UserCourse | null> {
  const { data, error } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new UserCourseFetchError('Failed to fetch user courses', error);
  }

  return data;
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches all parsed courses for a user as a flat array
 * @param userId - The user ID
 * @returns Array of parsed courses or empty array if not found
 */
export async function fetchUserCoursesArray(userId: string): Promise<ParsedCourse[]> {
  const record = await fetchUserCourses(userId);
  return record?.courses ?? [];
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Stores or replaces all courses for a user
 * Deletes any existing course record and inserts a new one with the provided courses
 * @param userId - The user ID
 * @param courses - Array of parsed courses to store
 * @returns Object with success status and count of courses stored
 */
export async function upsertUserCourses(
  userId: string,
  courses: ParsedCourse[]
): Promise<{ success: boolean; courseCount: number }> {
  try {
    // Validate input
    if (!userId) {
      throw new CourseUpsertError('User ID is required');
    }

    if (!Array.isArray(courses)) {
      throw new CourseUpsertError('Courses must be an array');
    }

    // Validate each course has required fields
    for (const course of courses) {
      if (!course.term || !course.subject || !course.number || !course.title) {
        throw new CourseUpsertError('All courses must have term, subject, number, and title');
      }

      if (typeof course.credits !== 'number' || course.credits < 0) {
        throw new CourseUpsertError('Course credits must be a non-negative number');
      }
    }

    // Delete existing record if it exists
    const { error: deleteError } = await supabase
      .from('user_courses')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      logError('Failed to delete existing courses', deleteError, {
        userId,
        action: 'delete_user_courses',
      });
      throw new CourseUpsertError('Failed to delete existing courses', deleteError);
    }

    logInfo('Deleted existing courses for user', {
      userId,
      action: 'delete_user_courses',
    });

    // Insert new record with courses as JSONB
    const { error: insertError } = await supabase
      .from('user_courses')
      .insert({
        user_id: userId,
        courses: courses,
      });

    if (insertError) {
      logError('Failed to insert courses', insertError, {
        userId,
        action: 'insert_user_courses',
      });
      throw new CourseUpsertError('Failed to insert courses', insertError);
    }

    logInfo('Successfully inserted courses for user', {
      userId,
      action: 'insert_user_courses',
      count: courses.length,
    });

    return {
      success: true,
      courseCount: courses.length,
    };
  } catch (error) {
    if (error instanceof CourseUpsertError) {
      throw error;
    }

    logError('Unexpected error upserting courses', error, {
      userId,
      action: 'upsert_user_courses',
    });

    throw new CourseUpsertError('Unexpected error upserting courses', error);
  }
}

/**
 * Helper function to format user courses for display in components
 * @param courses - Array of ParsedCourse objects
 * @returns Array of formatted courses ready for UI display
 */
export function formatCoursesForDisplay(courses: ParsedCourse[]): FormattedCourse[] {
  return courses.map((course, index) => ({
    id: `${course.subject}-${course.number}-${course.term}-${index}`, // Generate ID from course data
    code: `${course.subject} ${course.number}`,
    title: course.title,
    credits: course.credits,
    term: course.term,
    grade: course.grade || 'In Progress',
    tags: inferCourseTags(course),
  }));
}

/**
 * Helper function to infer course tags based on course properties
 * This is a simple heuristic - can be enhanced with more sophisticated logic
 * @param course - A ParsedCourse object
 * @returns Array of tag strings
 */
function inferCourseTags(course: ParsedCourse): string[] {
  const tags: string[] = [];

  // Add tag based on subject prefix
  const subject = course.subject.toUpperCase();

  // Common subject categories
  if (['CS', 'IS', 'IT', 'CIS'].includes(subject)) {
    tags.push('Computer Science');
  } else if (['MATH', 'STAT', 'CALC'].includes(subject)) {
    tags.push('Math');
  } else if (['ENG', 'ENGL', 'WRIT'].includes(subject)) {
    tags.push('English');
  } else if (['PHYS', 'CHEM', 'BIO', 'SCI'].includes(subject)) {
    tags.push('Science');
  } else if (['HIST', 'PHIL', 'LIT'].includes(subject)) {
    tags.push('Humanities');
  } else if (['ACC', 'BUS', 'ECON', 'FIN', 'MGT'].includes(subject)) {
    tags.push('Business');
  }

  // Add tag based on course number (100-level = intro, etc.)
  const courseNum = parseInt(course.number);
  if (!isNaN(courseNum)) {
    if (courseNum < 200) {
      tags.push('Introductory');
    } else if (courseNum >= 300) {
      tags.push('Advanced');
    }
  }

  // Add grade-based tag
  if (course.grade) {
    const gradeUpper = course.grade.toUpperCase();
    if (['A', 'A-', 'A+'].includes(gradeUpper)) {
      tags.push('High Grade');
    }
  }

  return tags.length > 0 ? tags : ['General'];
}
import { supabase } from '@/lib/supabase';

// Custom error types for better error handling
export class UserCourseFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'UserCourseFetchError';
  }
}

export interface UserCourse {
  id: string;
  user_id: string;
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
  confidence: number | null;
  source_document: string | null;
  inserted_at: string;
  updated_at: string;
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
 * Fetches all courses for a user
 * @param userId - The user ID
 * @returns Array of user courses
 */
export async function fetchUserCourses(userId: string): Promise<UserCourse[]> {
  const { data, error } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .order('term', { ascending: false })
    .order('subject', { ascending: true });

  if (error) {
    throw new UserCourseFetchError('Failed to fetch user courses', error);
  }

  return data || [];
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches courses for a user that were updated on a specific date
 * @param userId - The user ID
 * @param date - The date to filter by (ISO string or Date object)
 * @returns Array of user courses updated on that date
 */
export async function fetchUserCoursesByDate(
  userId: string,
  date: string | Date
): Promise<UserCourse[]> {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .gte('updated_at', startOfDay.toISOString())
    .lte('updated_at', endOfDay.toISOString())
    .order('term', { ascending: false })
    .order('subject', { ascending: true });

  if (error) {
    throw new UserCourseFetchError('Failed to fetch user courses by date', error);
  }

  return data || [];
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches courses for a user from the most recent upload batch
 * This finds the most recent updated_at timestamp and returns all courses with that timestamp
 * @param userId - The user ID
 * @returns Array of user courses from the most recent batch
 */
export async function fetchMostRecentUserCourses(userId: string): Promise<UserCourse[]> {
  // First, get the most recent updated_at timestamp
  const { data: latestCourse, error: latestError } = await supabase
    .from('user_courses')
    .select('updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new UserCourseFetchError('Failed to fetch latest course timestamp', latestError);
  }

  if (!latestCourse) {
    return [];
  }

  // Now fetch all courses with that same updated_at timestamp (or within the same day)
  return fetchUserCoursesByDate(userId, latestCourse.updated_at);
}

/**
 * Helper function to format user courses for display in components
 * @param courses - Array of UserCourse objects
 * @returns Array of formatted courses ready for UI display
 */
export function formatCoursesForDisplay(courses: UserCourse[]): FormattedCourse[] {
  return courses.map((course) => ({
    id: course.id,
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
 * @param course - A UserCourse object
 * @returns Array of tag strings
 */
function inferCourseTags(course: UserCourse): string[] {
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
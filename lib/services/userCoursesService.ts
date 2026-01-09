import { logError, logInfo } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

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

export class CourseTagUpdateError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseTagUpdateError';
  }
}

export class ManualCourseSaveError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ManualCourseSaveError';
  }
}

export class CourseFulfillmentUpdateError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseFulfillmentUpdateError';
  }
}

export const MAX_COURSE_FULFILLMENTS = 10;

export interface TransferCreditInfo {
  institution: string;          // Transfer institution name
  originalSubject: string;      // Original course subject code
  originalNumber: string;        // Original course number
  originalTitle: string;         // Original course title
  originalCredits: number;       // Original course credits
  originalGrade: string;         // Original course grade
}

export interface CourseFulfillment {
  programId: string;
  programName: string;
  requirementId: string;
  requirementDescription: string;
  matchType: 'auto' | 'manual';
  matchedAt: string;
  matchedCourseCode?: string;
  requirementType?: string;
}

export interface ParsedCourse {
  id?: string;
  term: string;
  subject: string;       // For transfer credits: the equivalent course subject
  number: string;        // For transfer credits: the equivalent course number
  title: string;         // For transfer credits: the equivalent course title
  credits: number | null;
  grade: string | null;
  tags?: string[];
  notes?: string | null;
  origin?: 'parsed' | 'manual' | 'transfer';

  // Transfer credit information (only populated when origin === 'transfer')
  transfer?: TransferCreditInfo;
  fulfillsRequirements?: CourseFulfillment[];
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
  notes?: string | null;
  origin?: 'parsed' | 'manual' | 'transfer';
  transfer?: TransferCreditInfo;
}

function generateCourseId(fallbackIndex: number): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }
  if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(4);
    globalCrypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((segment) => segment.toString(16).padStart(8, '0'))
      .join('-');
  }
  return `course-${Date.now()}-${fallbackIndex}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCredits(value: unknown, fallback: number | null = 0): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeFulfillments(value: unknown): CourseFulfillment[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .slice(0, MAX_COURSE_FULFILLMENTS)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Partial<CourseFulfillment>;
      const programId = raw.programId ? String(raw.programId) : '';
      const programName = raw.programName ? String(raw.programName).trim() : '';
      const requirementId = raw.requirementId ? String(raw.requirementId).trim() : '';
      const requirementDescription = raw.requirementDescription ? String(raw.requirementDescription).trim() : '';

      if (!programId || !programName || !requirementId || !requirementDescription) {
        return null;
      }

      const normalizedEntry: CourseFulfillment = {
        programId,
        programName,
        requirementId,
        requirementDescription,
        matchType: raw.matchType === 'manual' ? 'manual' : 'auto',
        matchedAt: typeof raw.matchedAt === 'string' ? raw.matchedAt : new Date().toISOString(),
      };

      if (raw.matchedCourseCode) {
        const code = String(raw.matchedCourseCode).trim();
        if (code) {
          normalizedEntry.matchedCourseCode = code;
        }
      }

      if (raw.requirementType) {
        normalizedEntry.requirementType = String(raw.requirementType);
      }

      return normalizedEntry;
    })
    .filter((entry): entry is CourseFulfillment => Boolean(entry));

  return normalized.length > 0 ? normalized : undefined;
}

function sanitizeFulfillmentsForSave(entries: CourseFulfillment[] | undefined): CourseFulfillment[] {
  const normalized = normalizeFulfillments(entries) ?? [];
  const timestamp = new Date().toISOString();

  return normalized.slice(0, MAX_COURSE_FULFILLMENTS).map((entry) => ({
    ...entry,
    matchedAt: entry.matchedAt || timestamp,
  }));
}

export function normalizeParsedCourses(courses?: ParsedCourse[] | null): ParsedCourse[] {
  if (!Array.isArray(courses)) return [];

  return courses.map((course, index) => {
    const normalized: ParsedCourse = { ...course };

    normalized.id = normalized.id ?? generateCourseId(index);
    normalized.origin = normalized.origin === 'transfer' ? 'transfer' : normalized.origin === 'manual' ? 'manual' : 'parsed';
    normalized.term = typeof normalized.term === 'string' ? normalized.term : '';
    normalized.subject = typeof normalized.subject === 'string' ? normalized.subject : 'GEN';
    normalized.number = typeof normalized.number === 'string' ? normalized.number : normalized.id ?? String(index);
    normalized.title = typeof normalized.title === 'string' ? normalized.title : 'Untitled Course';
    normalized.credits = normalizeCredits(normalized.credits, normalized.origin === 'manual' ? null : 0);
    normalized.grade = typeof normalized.grade === 'string' ? normalized.grade : normalized.grade === null ? null : 'In Progress';

    if (!Array.isArray(normalized.tags)) {
      normalized.tags = [];
    }
    normalized.tags = Array.from(
      new Set(
        normalized.tags
          .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter((tag): tag is string => Boolean(tag))
      )
    );

    if (normalized.notes !== undefined && typeof normalized.notes !== 'string') {
      normalized.notes = null;
    }

    // Validate transfer field if present
    if (normalized.transfer) {
      // Ensure all required transfer fields are present and valid
      if (
        typeof normalized.transfer.institution === 'string' &&
        typeof normalized.transfer.originalSubject === 'string' &&
        typeof normalized.transfer.originalNumber === 'string' &&
        typeof normalized.transfer.originalTitle === 'string' &&
        typeof normalized.transfer.originalCredits === 'number' &&
        typeof normalized.transfer.originalGrade === 'string'
      ) {
        // Transfer data is valid, keep it
        normalized.origin = 'transfer';
      } else {
        // Invalid transfer data, remove it
        delete normalized.transfer;
      }
    }

    normalized.fulfillsRequirements = normalizeFulfillments(normalized.fulfillsRequirements);

    return normalized;
  });
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches the user's course record (containing all courses as JSON)
 * @param supabase - Supabase client (browser or server)
 * @param userId - The user ID
 * @returns UserCourse record or null if not found
 */
export async function fetchUserCourses(supabase: SupabaseClient, userId: string): Promise<UserCourse | null> {
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
 * @param supabase - Supabase client (browser or server)
 * @param userId - The user ID
 * @returns Array of parsed courses or empty array if not found
 */
export async function fetchUserCoursesArray(supabase: SupabaseClient, userId: string): Promise<ParsedCourse[]> {
  const record = await fetchUserCourses(supabase, userId);
  return normalizeParsedCourses(record?.courses);
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Stores or replaces all courses for a user
 * Deletes any existing course record and inserts a new one with the provided courses
 * @param supabase - Supabase client (browser or server)
 * @param userId - The user ID
 * @param courses - Array of parsed courses to store
 * @returns Object with success status and count of courses stored
 */
export async function upsertUserCourses(
  supabase: SupabaseClient,
  userId: string,
  courses: ParsedCourse[]
): Promise<{ success: boolean; courseCount: number }> {
  try {
    if (!userId) {
      throw new CourseUpsertError('User ID is required');
    }

    if (!Array.isArray(courses)) {
      throw new CourseUpsertError('Courses must be an array');
    }

    const normalizedCourses = normalizeParsedCourses(courses).map((course) => ({
      ...course,
      origin: course.origin === 'manual' ? 'manual' : 'parsed',
    }));

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

    const { error: insertError } = await supabase
      .from('user_courses')
      .insert({
        user_id: userId,
        courses: normalizedCourses,
      });

    if (insertError) {
      logError('Failed to insert courses', insertError, {
        userId,
        action: 'insert_user_courses',
      });
      throw new CourseUpsertError('Failed to insert courses', insertError);
    }

    return {
      success: true,
      courseCount: normalizedCourses.length,
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
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Updates tags for a specific course
 * @param supabase - Supabase client (browser or server)
 * @param userId - The user ID
 * @param courseId - The course ID to update
 * @param tags - New array of tags for the course
 * @returns Object with success status and updated tags
 */
export async function updateUserCourseTags(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  tags: string[]
): Promise<{ success: boolean; tags: string[] }> {
  if (!userId) {
    throw new CourseTagUpdateError('User ID is required to update tags');
  }
  if (!courseId) {
    throw new CourseTagUpdateError('Course ID is required to update tags');
  }

  const cleanedTags = Array.from(
    new Set(tags.map((tag) => (typeof tag === 'string' ? tag.trim() : '')).filter((tag): tag is string => Boolean(tag)))
  );

  try {
    const record = await fetchUserCourses(supabase, userId);
    if (!record?.courses) {
      logError('No course record found for user when updating tags', null, {
        userId,
        action: 'update_user_course_tags',
      });
      return { success: false, tags: [] };
    }

    let updated = false;
    const updatedCourses = record.courses.map((course, idx) => {
      const currentId = course.id ?? generateCourseId(idx);
      if (currentId === courseId) {
        updated = true;
        logInfo('Updating tags for course', {
          userId,
          action: 'update_user_course_tags',
        });
        return {
          ...course,
          id: currentId,
          origin: course.origin === 'manual' ? 'manual' : 'parsed',
          tags: cleanedTags,
        };
      }
      return course;
    });

    if (!updated) {
      logError('Course ID not found in user courses', null, {
        userId,
        action: 'update_user_course_tags',
      });
      return { success: false, tags: [] };
    }

    const { error } = await supabase
      .from('user_courses')
      .update({ courses: updatedCourses })
      .eq('user_id', userId);

    if (error) {
      logError('Failed to update user course tags in database', error, {
        userId,
        action: 'update_user_course_tags',
      });
      throw new CourseTagUpdateError('Failed to update course tags', error);
    }

    logInfo('Successfully updated course tags', {
      userId,
      action: 'update_user_course_tags',
    });

    return { success: true, tags: cleanedTags };
  } catch (error) {
    if (error instanceof CourseTagUpdateError) {
      throw error;
    }
    logError('Unexpected error updating course tags', error, {
      userId,
      action: 'update_user_course_tags',
    });
    throw new CourseTagUpdateError('Unexpected error updating course tags', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Updates requirement fulfillments for a specific course
 */
export async function updateCourseFulfillments(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  fulfillments: CourseFulfillment[]
): Promise<{ success: boolean; course: ParsedCourse }> {
  if (!userId) {
    throw new CourseFulfillmentUpdateError('User ID is required to update course fulfillments');
  }
  if (!courseId) {
    throw new CourseFulfillmentUpdateError('Course ID is required to update course fulfillments');
  }

  const cleanedFulfillments = sanitizeFulfillmentsForSave(fulfillments);

  try {
    const record = await fetchUserCourses(supabase, userId);
    if (!record?.courses || record.courses.length === 0) {
      throw new CourseFulfillmentUpdateError('No courses found for this user');
    }

    const normalizedCourses = normalizeParsedCourses(record.courses);
    const targetIndex = normalizedCourses.findIndex((course) => course.id === courseId);

    if (targetIndex === -1) {
      throw new CourseFulfillmentUpdateError('Course not found');
    }

    const updatedCourse: ParsedCourse = {
      ...normalizedCourses[targetIndex],
      fulfillsRequirements: cleanedFulfillments.length > 0 ? cleanedFulfillments : undefined,
    };

    normalizedCourses[targetIndex] = updatedCourse;

    const { error } = await supabase
      .from('user_courses')
      .update({ courses: normalizedCourses })
      .eq('user_id', userId);

    if (error) {
      logError('Failed to update course fulfillments', error, {
        userId,
        action: 'update_course_fulfillments',
      });
      throw new CourseFulfillmentUpdateError('Failed to update course fulfillments', error);
    }

    logInfo('Updated course fulfillments', {
      userId,
      action: 'update_course_fulfillments',
      count: cleanedFulfillments.length,
    });

    return { success: true, course: updatedCourse };
  } catch (error) {
    if (error instanceof CourseFulfillmentUpdateError) {
      throw error;
    }
    logError('Unexpected error updating course fulfillments', error, {
      userId,
      action: 'update_course_fulfillments',
    });
    throw new CourseFulfillmentUpdateError('Unexpected error updating course fulfillments', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Saves manual courses alongside existing parsed courses
 * @param supabase - Supabase client (browser or server)
 * @param userId - The user ID
 * @param manualCourses - Array of manually entered courses
 * @param options - Optional existing parsed courses to avoid refetching
 * @returns Object with success status and count of manual courses saved
 */
export async function saveManualCourses(
  supabase: SupabaseClient,
  userId: string,
  manualCourses: ParsedCourse[],
  options?: { existingParsed?: ParsedCourse[] }
): Promise<{ success: boolean; manualCount: number }> {
  if (!userId) {
    throw new ManualCourseSaveError('User ID is required to save manual courses');
  }

  const manualPayload = normalizeParsedCourses(manualCourses).map((course, index) => ({
    ...course,
    id: course.id ?? generateCourseId(index + 1000),
    origin: 'manual' as const,
    credits: normalizeCredits(course.credits, null),
  }));

  let existingParsed = options?.existingParsed ? normalizeParsedCourses(options.existingParsed) : undefined;
  let record: UserCourse | null = null;

  if (!existingParsed) {
    record = await fetchUserCourses(supabase, userId);
    existingParsed = normalizeParsedCourses(
      record?.courses?.filter((course) => (course.origin ?? 'parsed') !== 'manual') ?? []
    ).map((course) => ({ ...course, origin: 'parsed' as const }));
  }

  const mergedCourses: ParsedCourse[] = [
    ...(existingParsed ?? []).map((course, index) => ({
      ...course,
      id: course.id ?? generateCourseId(index),
      origin: 'parsed' as const,
      credits: normalizeCredits(course.credits, 0),
    })),
    ...manualPayload,
  ];

  try {
    if (!record && !options?.existingParsed) {
      record = await fetchUserCourses(supabase, userId);
    }

    if (!record && !options?.existingParsed) {
      const { error: insertError } = await supabase
        .from('user_courses')
        .insert({ user_id: userId, courses: mergedCourses });

      if (insertError) {
        logError('Failed to insert manual courses', insertError, {
          userId,
          action: 'insert_manual_courses',
        });
        throw new ManualCourseSaveError('Failed to insert manual courses', insertError);
      }
    } else {
      const { error: updateError } = await supabase
        .from('user_courses')
        .update({ courses: mergedCourses })
        .eq('user_id', userId);

      if (updateError) {
        logError('Failed to update manual courses', updateError, {
          userId,
          action: 'update_manual_courses',
        });
        throw new ManualCourseSaveError('Failed to update manual courses', updateError);
      }
    }

    return { success: true, manualCount: manualPayload.length };
  } catch (error) {
    if (error instanceof ManualCourseSaveError) {
      throw error;
    }
    logError('Unexpected error saving manual courses', error, {
      userId,
      action: 'save_manual_courses',
    });
    throw new ManualCourseSaveError('Unexpected error saving manual courses', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Deletes all courses for a user by removing their user_courses record
 * @param supabase - Supabase client (browser or server)
 * @param userId - The user ID
 * @returns Object with success status
 */
export async function clearUserCourses(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean }> {
  try {
    if (!userId) {
      throw new CourseUpsertError('User ID is required');
    }

    const { error: deleteError } = await supabase
      .from('user_courses')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      logError('Failed to clear user courses', deleteError, {
        userId,
        action: 'clear_user_courses',
      });
      throw new CourseUpsertError('Failed to clear user courses', deleteError);
    }

    logInfo('Successfully cleared all courses for user', {
      userId,
      action: 'clear_user_courses',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof CourseUpsertError) {
      throw error;
    }

    logError('Unexpected error clearing courses', error, {
      userId,
      action: 'clear_user_courses',
    });

    throw new CourseUpsertError('Unexpected error clearing courses', error);
  }
}

/**
 * Helper function to format user courses for display in components
 * @param courses - Array of ParsedCourse objects
 * @returns Array of formatted courses ready for UI display
 */
export function formatCoursesForDisplay(courses: ParsedCourse[]): FormattedCourse[] {
  return courses.map((course, index) => {
    const formatted: FormattedCourse = {
      id: course.id ?? `${course.subject}-${course.number}-${course.term}-${index}`,
      code: `${course.subject} ${course.number}`.trim(),
      title: course.title,
      credits: typeof course.credits === 'number' ? course.credits : 0,
      term: course.term,
      grade: course.grade || 'In Progress',
      tags: course.tags && course.tags.length > 0 ? course.tags : inferCourseTags(course),
      notes: course.notes ?? null,
      origin: course.origin,
    };

    // Include transfer information if present
    if (course.transfer) {
      formatted.transfer = course.transfer;
    }

    return formatted;
  });
}

/**
 * Helper function to infer course tags based on course properties
 * This is a simple heuristic - can be enhanced with more sophisticated logic
 * @param course - A ParsedCourse object
 * @returns Array of tag strings
 */
function inferCourseTags(course: ParsedCourse): string[] {
  const tags: string[] = [];

  const subject = course.subject.toUpperCase();

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

  const courseNum = parseInt(course.number);
  if (!isNaN(courseNum)) {
    if (courseNum < 200) {
      tags.push('Introductory');
    } else if (courseNum >= 300) {
      tags.push('Advanced');
    }
  }

  if (course.grade) {
    const gradeUpper = course.grade.toUpperCase();
    if (['A', 'A-', 'A+'].includes(gradeUpper)) {
      tags.push('High Grade');
    }
  }

  return tags.length > 0 ? tags : ['General'];
}

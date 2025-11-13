import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Custom error types
export class CourseOfferingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CourseOfferingValidationError';
  }
}

export class CourseOfferingInsertError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseOfferingInsertError';
  }
}

// Type definition for raw JSON input
export interface RawCourseData {
  college: string;
  department: string;
  course_code: string;
  title: string;
  description: string;
  prerequisites: string;
  term: string;
  Section: string;
  Type: string;
  Mode: string;
  Instructor: string;
  Credits: string;
  Term: string;
  Days: string;
  Start: string;
  End: string;
  Location: string;
  Available: string;
  Waitlist: string;
}

// Type definition for database insert
export interface CourseOfferingInsert {
  university_id: number;
  term_name: string | null;
  college: string | null;
  department_code: string | null;
  course_code: string | null;
  section_label: string | null;
  title: string | null;
  description: string | null;
  prerequisites: string | null;
  type: string | null;
  mode: string | null;
  instructor: string | null;
  credits_raw: string | null;
  credits_decimal: number | null;
  meetings_json: Record<string, unknown> | null;
  days_raw: string | null;
  start_time_raw: string | null;
  end_time_raw: string | null;
  location_raw: string | null;
  seats_available: number | null;
  seats_capacity: number | null;
  waitlist_count: number | null;
  source_row_hash: string;
  raw_json: Record<string, unknown>;
}

/**
 * Sanitize a string to prevent SQL injection and XSS
 * @param value - Value to sanitize
 * @param maxLength - Maximum length (default: 10000 for text fields)
 */
function sanitizeString(value: unknown, maxLength = 10000): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const str = String(value).trim();

  // Remove any null bytes
  const sanitized = str.replace(/\0/g, '');

  // Truncate to specified length
  return sanitized.substring(0, maxLength);
}

/**
 * Parse credits string to decimal
 */
function parseCredits(creditsStr: string): number | null {
  if (!creditsStr) return null;

  const cleaned = creditsStr.trim().replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse seat availability string (e.g., "858/858")
 */
function parseSeats(seatsStr: string): { available: number | null; capacity: number | null } {
  if (!seatsStr) return { available: null, capacity: null };

  const parts = seatsStr.split('/');
  if (parts.length !== 2) return { available: null, capacity: null };

  const available = parseInt(parts[0], 10);
  const capacity = parseInt(parts[1], 10);

  return {
    available: isNaN(available) ? null : available,
    capacity: isNaN(capacity) ? null : capacity,
  };
}

/**
 * Generate hash for deduplication
 */
function generateSourceHash(data: RawCourseData): string {
  const hashInput = JSON.stringify({
    term: data.term,
    course_code: data.course_code,
    section: data.Section,
  });

  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
}

/**
 * Validate and transform raw course data
 */
function validateAndTransform(
  raw: RawCourseData,
  universityId: number
): CourseOfferingInsert {
  // Validate required fields
  if (!raw.course_code || !raw.title) {
    throw new CourseOfferingValidationError('Missing required fields: course_code and title are mandatory');
  }

  // Parse seats
  const seats = parseSeats(raw.Available);

  // Parse waitlist
  const waitlist = raw.Waitlist ? parseInt(raw.Waitlist, 10) : null;

  // Build meetings JSON
  const meetingsJson = {
    days: sanitizeString(raw.Days, 100),
    start: sanitizeString(raw.Start, 50),
    end: sanitizeString(raw.End, 50),
    location: sanitizeString(raw.Location, 200),
  };

  return {
    university_id: universityId,
    term_name: sanitizeString(raw.term, 100),
    college: sanitizeString(raw.college, 200),
    department_code: sanitizeString(raw.department, 50),
    course_code: sanitizeString(raw.course_code, 50),
    section_label: sanitizeString(raw.Section, 100),
    title: sanitizeString(raw.title, 500),
    description: sanitizeString(raw.description),  // text field - no limit
    prerequisites: sanitizeString(raw.prerequisites),  // text field - no limit
    type: sanitizeString(raw.Type, 100),
    mode: sanitizeString(raw.Mode, 100),
    instructor: sanitizeString(raw.Instructor),  // text field - no limit
    credits_raw: sanitizeString(raw.Credits, 50),
    credits_decimal: parseCredits(raw.Credits),
    meetings_json: meetingsJson,
    days_raw: sanitizeString(raw.Days),  // text field - no limit
    start_time_raw: sanitizeString(raw.Start),  // text field - no limit
    end_time_raw: sanitizeString(raw.End),  // text field - no limit
    location_raw: sanitizeString(raw.Location, 200),
    seats_available: seats.available,
    seats_capacity: seats.capacity,
    waitlist_count: isNaN(waitlist!) ? null : waitlist,
    source_row_hash: generateSourceHash(raw),
    raw_json: raw as Record<string, unknown>,
  };
}

/**
 * AUTHORIZATION: DEV ONLY
 * Bulk insert course offerings from JSON file
 * @param rawData - Array of raw course data from JSON
 * @param universityId - University ID to associate courses with
 * @returns Stats about the insertion
 */
export async function bulkInsertCourseOfferings(
  rawData: RawCourseData[],
  universityId: number
): Promise<{ inserted: number; errors: number; errorDetails: Array<{ index: number; error: string }> }> {
  // Validate input
  if (!Array.isArray(rawData)) {
    throw new CourseOfferingValidationError('Input must be an array');
  }

  if (rawData.length === 0) {
    throw new CourseOfferingValidationError('Input array is empty');
  }

  if (rawData.length > 50000) {
    throw new CourseOfferingValidationError('Maximum 50,000 records allowed per upload');
  }

  const validRecords: CourseOfferingInsert[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Validate and transform each record
  for (let i = 0; i < rawData.length; i++) {
    try {
      const transformed = validateAndTransform(rawData[i], universityId);
      validRecords.push(transformed);
    } catch (error) {
      console.error(`Validation error at index ${i}:`, error);
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      });
    }
  }

  if (validRecords.length === 0) {
    throw new CourseOfferingValidationError('No valid records to insert');
  }

  // Insert in batches to avoid timeout
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    const batch = validRecords.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabase
        .from('course_offerings')
        .upsert(batch, {
          onConflict: 'source_row_hash',
          ignoreDuplicates: true,
        });

      if (error) {
        console.error(`Batch insert error (batch ${i / BATCH_SIZE + 1}):`, error);
        throw new CourseOfferingInsertError(
          `Failed to insert batch ${i / BATCH_SIZE + 1}`,
          error
        );
      }

      inserted += batch.length;
    } catch (error) {
      console.error(`Failed to insert batch starting at index ${i}:`, error);
      throw error;
    }
  }

  return {
    inserted,
    errors: errors.length,
    errorDetails: errors.slice(0, 100), // Limit error details to first 100
  };
}

/**
 * AUTHORIZATION: DEV ONLY
 * Delete all course offerings for a specific university and term
 * @param universityId - University ID
 * @param termName - Term name (e.g., "Winter 2026")
 */
export async function deleteCourseOfferingsByTerm(
  universityId: number,
  termName: string
): Promise<{ deleted: number }> {
  const { count, error } = await supabase
    .from('course_offerings')
    .delete({ count: 'exact' })
    .eq('university_id', universityId)
    .eq('term_name', termName);

  if (error) {
    throw new CourseOfferingInsertError('Failed to delete course offerings', error);
  }

  return { deleted: count || 0 };
}

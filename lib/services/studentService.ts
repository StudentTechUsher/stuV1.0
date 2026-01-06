/**
 * Student Service
 * Handles all database operations for the student table
 */

import { logError, logInfo } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

// Custom error types
export class StudentNotFoundError extends Error {
  constructor(message = 'Student record not found') {
    super(message);
    this.name = 'StudentNotFoundError';
  }
}

export class StudentUpdateError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StudentUpdateError';
  }
}

export class StudentFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StudentFetchError';
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Updates the GPA for a student record
 * @param supabaseClient - Supabase client (browser or server)
 * @param profileId - The user's profile ID (from auth.users)
 * @param gpa - The calculated GPA (0.0-4.0) or null to clear
 * @returns Updated student record
 */
export async function updateStudentGpa(
  supabaseClient: SupabaseClient,
  profileId: string,
  gpa: number | null
): Promise<{ success: boolean; gpa: number | null }> {
  try {
    // Validate GPA range if provided
    if (gpa !== null && (gpa < 0.0 || gpa > 4.0)) {
      throw new StudentUpdateError('GPA must be between 0.0 and 4.0');
    }

    // Round to 2 decimal places if provided
    const roundedGpa = gpa !== null ? Math.round(gpa * 100) / 100 : null;

    // Update student record
    const { data, error } = await supabaseClient
      .from('student')
      .update({ gpa: roundedGpa })
      .eq('profile_id', profileId)
      .select('gpa')
      .single();

    if (error) {
      // Check if student record doesn't exist
      if (error.code === 'PGRST116') {
        logError('Student record not found when updating GPA', error, {
          userId: profileId,
          action: 'update_student_gpa',
        });
        throw new StudentNotFoundError(`Student record not found for profile ${profileId}`);
      }
      throw new StudentUpdateError('Failed to update student GPA', error);
    }

    logInfo('Successfully updated student GPA', {
      userId: profileId,
      action: 'update_student_gpa',
    });

    return {
      success: true,
      gpa: data.gpa,
    };
  } catch (error) {
    if (error instanceof StudentNotFoundError || error instanceof StudentUpdateError) {
      throw error;
    }
    logError('Unexpected error updating student GPA', error, {
      userId: profileId,
      action: 'update_student_gpa',
    });
    throw new StudentUpdateError('Unexpected error updating student GPA', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Fetches the student record including GPA
 * @param supabaseClient - Supabase client (browser or server)
 * @param profileId - The user's profile ID
 * @returns Student record with GPA or null if not found
 */
export async function fetchStudentGpa(
  supabaseClient: SupabaseClient,
  profileId: string
): Promise<{ gpa: number | null } | null> {
  try {
    const { data, error } = await supabaseClient
      .from('student')
      .select('gpa')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw new StudentFetchError('Failed to fetch student GPA', error);
    }

    return data;
  } catch (error) {
    if (error instanceof StudentFetchError) {
      throw error;
    }
    logError('Unexpected error fetching student GPA', error, {
      userId: profileId,
      action: 'fetch_student_gpa',
    });
    throw new StudentFetchError('Unexpected error fetching student GPA', error);
  }
}

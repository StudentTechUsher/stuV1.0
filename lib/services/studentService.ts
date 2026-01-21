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

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Updates graduation timeline information
 * @param supabaseClient - Supabase client (browser or server)
 * @param profileId - The user's profile ID
 * @param data - Graduation timeline data
 * @returns Updated student record
 */
export async function updateGraduationTimeline(
  supabaseClient: SupabaseClient,
  profileId: string,
  data: {
    est_grad_date?: string | null;
    est_grad_term?: string | null;
    admission_year?: number | null;
  }
): Promise<{ success: boolean }> {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (data.est_grad_date !== undefined) updateData.est_grad_date = data.est_grad_date;
    if (data.est_grad_term !== undefined) updateData.est_grad_term = data.est_grad_term;
    if (data.admission_year !== undefined) updateData.admission_year = data.admission_year;

    // Update student record
    const { error } = await supabaseClient
      .from('student')
      .update(updateData)
      .eq('profile_id', profileId);

    if (error) {
      // Check if student record doesn't exist
      if (error.code === 'PGRST116') {
        logError('Student record not found when updating graduation timeline', error, {
          userId: profileId,
          action: 'update_graduation_timeline',
        });
        throw new StudentNotFoundError(`Student record not found for profile ${profileId}`);
      }
      throw new StudentUpdateError('Failed to update graduation timeline', error);
    }

    logInfo('Successfully updated graduation timeline', {
      userId: profileId,
      action: 'update_graduation_timeline',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof StudentNotFoundError || error instanceof StudentUpdateError) {
      throw error;
    }
    logError('Unexpected error updating graduation timeline', error, {
      userId: profileId,
      action: 'update_graduation_timeline',
    });
    throw new StudentUpdateError('Unexpected error updating graduation timeline', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Updates student type (undergraduate vs graduate)
 * @param supabaseClient - Supabase client
 * @param profileId - The user's profile ID
 * @param studentType - 'undergraduate' or 'graduate'
 * @returns Updated student record
 */
export async function updateStudentType(
  supabaseClient: SupabaseClient,
  profileId: string,
  studentType: 'undergraduate' | 'graduate'
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabaseClient
      .from('student')
      .update({ student_type: studentType })
      .eq('profile_id', profileId);

    if (error) {
      if (error.code === 'PGRST116') {
        logError('Student record not found when updating student type', error, {
          userId: profileId,
          action: 'update_student_type',
        });
        throw new StudentNotFoundError(`Student record not found for profile ${profileId}`);
      }
      throw new StudentUpdateError('Failed to update student type', error);
    }

    logInfo('Successfully updated student type', {
      userId: profileId,
      action: 'update_student_type',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof StudentNotFoundError || error instanceof StudentUpdateError) {
      throw error;
    }
    logError('Unexpected error updating student type', error, {
      userId: profileId,
      action: 'update_student_type',
    });
    throw new StudentUpdateError('Unexpected error updating student type', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Updates work status during studies
 * @param supabaseClient - Supabase client
 * @param profileId - The user's profile ID
 * @param workStatus - Work status enum value
 * @returns Updated student record
 */
export async function updateWorkStatus(
  supabaseClient: SupabaseClient,
  profileId: string,
  workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable'
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabaseClient
      .from('student')
      .update({ work_status: workStatus })
      .eq('profile_id', profileId);

    if (error) {
      if (error.code === 'PGRST116') {
        logError('Student record not found when updating work status', error, {
          userId: profileId,
          action: 'update_work_status',
        });
        throw new StudentNotFoundError(`Student record not found for profile ${profileId}`);
      }
      throw new StudentUpdateError('Failed to update work status', error);
    }

    logInfo('Successfully updated work status', {
      userId: profileId,
      action: 'update_work_status',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof StudentNotFoundError || error instanceof StudentUpdateError) {
      throw error;
    }
    logError('Unexpected error updating work status', error, {
      userId: profileId,
      action: 'update_work_status',
    });
    throw new StudentUpdateError('Unexpected error updating work status', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Updates career goals
 * @param supabaseClient - Supabase client
 * @param profileId - The user's profile ID
 * @param careerGoals - Free text career goals
 * @returns Updated student record
 */
export async function updateCareerGoals(
  supabaseClient: SupabaseClient,
  profileId: string,
  careerGoals: string | null
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabaseClient
      .from('student')
      .update({ career_goals: careerGoals })
      .eq('profile_id', profileId);

    if (error) {
      if (error.code === 'PGRST116') {
        logError('Student record not found when updating career goals', error, {
          userId: profileId,
          action: 'update_career_goals',
        });
        throw new StudentNotFoundError(`Student record not found for profile ${profileId}`);
      }
      throw new StudentUpdateError('Failed to update career goals', error);
    }

    logInfo('Successfully updated career goals', {
      userId: profileId,
      action: 'update_career_goals',
    });

    return { success: true };
  } catch (error) {
    if (error instanceof StudentNotFoundError || error instanceof StudentUpdateError) {
      throw error;
    }
    logError('Unexpected error updating career goals', error, {
      userId: profileId,
      action: 'update_career_goals',
    });
    throw new StudentUpdateError('Unexpected error updating career goals', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Fetches student planning data (graduation timeline, student type, work status, career goals)
 * @param supabaseClient - Supabase client
 * @param profileId - The user's profile ID
 * @returns Student planning data or null if not found
 */
export async function fetchStudentPlanningData(
  supabaseClient: SupabaseClient,
  profileId: string
): Promise<{
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  is_transfer: boolean | null;
  student_type: string | null;
  work_status: string | null;
  career_goals: string | null;
} | null> {
  try {
    const { data, error } = await supabaseClient
      .from('student')
      .select('est_grad_date, est_grad_term, admission_year, is_transfer, student_type, work_status, career_goals')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw new StudentFetchError('Failed to fetch student planning data', error);
    }

    return data;
  } catch (error) {
    if (error instanceof StudentFetchError) {
      throw error;
    }
    logError('Unexpected error fetching student planning data', error, {
      userId: profileId,
      action: 'fetch_student_planning_data',
    });
    throw new StudentFetchError('Unexpected error fetching student planning data', error);
  }
}

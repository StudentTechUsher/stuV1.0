import { supabase } from '@/lib/supabase';
import type { WithdrawalRow, Advisor } from '@/types/withdrawals';

// Custom error types for better error handling
export class WithdrawalFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'WithdrawalFetchError';
  }
}

export class AdvisorNotFoundError extends Error {
  constructor(message = 'Advisor not found') {
    super(message);
    this.name = 'AdvisorNotFoundError';
  }
}

export interface WithdrawalSummary {
  total: number;
  byCollege: Record<string, number>;
  byDepartment: Record<string, number>;
  byMajor: Record<string, number>;
}

export interface WithdrawalQueryResult {
  rows: WithdrawalRow[];
  summary: WithdrawalSummary;
}

/**
 * AUTHORIZATION: ADVISORS ONLY
 * Fetches weekly withdrawals for a specific advisor within a date range
 * @param advisorId - The advisor's ID
 * @param startDate - Start date (ISO 8601)
 * @param endDate - End date (ISO 8601)
 * @returns Withdrawal data and summary statistics
 */
export async function fetchAdvisorWeeklyWithdrawals(
  advisorId: string,
  startDate: string,
  endDate: string
): Promise<WithdrawalQueryResult> {
  if (!advisorId || !startDate || !endDate) {
    throw new WithdrawalFetchError('Missing required parameters: advisorId, startDate, endDate');
  }

  try {
    // Fetch advisor to determine scope
    const { data: advisor, error: advisorError } = await supabase
      .from('advisors')
      .select('*')
      .eq('id', advisorId)
      .single();

    if (advisorError) {
      if (advisorError.code === 'PGRST116') {
        throw new AdvisorNotFoundError(`Advisor with ID "${advisorId}" not found`);
      }
      throw new WithdrawalFetchError('Failed to fetch advisor', advisorError);
    }

    // Build query based on advisor scope
    let query = supabase
      .from('withdrawals')
      .select(`
        *,
        student:students!inner(*),
        course:courses(*)
      `)
      .gte('action_at', startDate)
      .lte('action_at', endDate)
      .eq('action', 'WITHDRAW');

    // Apply scope filters
    if (advisor.scope === 'COLLEGE' && advisor.college_id) {
      query = query.eq('student.college_id', advisor.college_id);
    } else if (advisor.scope === 'DEPARTMENT' && advisor.department_id) {
      query = query.eq('student.department_id', advisor.department_id);
    } else if (advisor.scope === 'MAJOR' && advisor.major_id) {
      query = query.eq('student.major_id', advisor.major_id);
    }
    // If UNIVERSITY scope, no additional filters needed

    const { data, error } = await query;

    if (error) {
      throw new WithdrawalFetchError('Failed to fetch withdrawals', error);
    }

    const rows: WithdrawalRow[] = data || [];

    // Calculate summary statistics
    const byCollege: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byMajor: Record<string, number> = {};

    rows.forEach((row) => {
      const collegeId = row.student.collegeId || 'unknown';
      const departmentId = row.student.departmentId || 'unknown';
      const majorId = row.student.majorId || 'unknown';

      byCollege[collegeId] = (byCollege[collegeId] || 0) + 1;
      byDepartment[departmentId] = (byDepartment[departmentId] || 0) + 1;
      byMajor[majorId] = (byMajor[majorId] || 0) + 1;
    });

    return {
      rows,
      summary: {
        total: rows.length,
        byCollege,
        byDepartment,
        byMajor,
      },
    };
  } catch (error) {
    if (error instanceof WithdrawalFetchError || error instanceof AdvisorNotFoundError) {
      throw error;
    }
    throw new WithdrawalFetchError('Failed to fetch advisor weekly withdrawals', error);
  }
}

/**
 * AUTHORIZATION: ADVISORS ONLY
 * Fetches the outbox for withdrawal email digest
 * @param advisorId - The advisor's ID
 * @returns Array of pending withdrawal notifications
 */
export async function fetchWithdrawalOutbox(advisorId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('withdrawal_outbox')
    .select('*')
    .eq('advisor_id', advisorId)
    .eq('sent', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new WithdrawalFetchError('Failed to fetch withdrawal outbox', error);
  }

  return data || [];
}

/**
 * AUTHORIZATION: SYSTEM/CRON ONLY
 * Triggers the weekly withdrawal digest job
 * This should only be called by scheduled tasks
 * @returns Job execution result
 */
export async function runWeeklyWithdrawalDigest(): Promise<{ success: boolean; message: string }> {
  try {
    // Call edge function or job processor
    const { data, error } = await supabase.functions.invoke('weekly-withdrawal-digest');

    if (error) {
      throw new WithdrawalFetchError('Failed to run weekly digest', error);
    }

    return {
      success: true,
      message: data?.message || 'Weekly withdrawal digest completed',
    };
  } catch (error) {
    throw new WithdrawalFetchError('Failed to run weekly withdrawal digest', error);
  }
}

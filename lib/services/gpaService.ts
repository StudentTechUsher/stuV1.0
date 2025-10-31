/**
 * GPA Prediction Calculator Service
 * Handles computation of required future grades for target graduation GPA
 */

// Database client is passed as parameter for flexibility with auth context
import { logError, logInfo } from '@/lib/logger';
import {
  computeTotalsFromTranscript,
  distributionForTarget,
  type RemainingCourse
} from '@/lib/gpa/core';
import {
  validateDistributionRequest,
  ValidationError
} from '@/lib/gpa/validation';
import type { GradeKey } from '@/lib/gpa/gradeScale';
import { fetchUserCoursesArray, type ParsedCourse } from './userCoursesService';
import { GetActiveGradPlan } from './gradPlanService';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Custom error types
 */
export class NoTranscriptError extends Error {
  constructor(message = 'User has no transcript synced') {
    super(message);
    this.name = 'NoTranscriptError';
  }
}

export class GPACalculationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'GPACalculationError';
  }
}

/**
 * Remaining course in grad plan for calculator
 */
export type RemainingCourseDTO = {
  id?: string;
  courseCode: string;
  title: string;
  credits: number;
  goalGrade?: GradeKey | null;
  termName?: string;
};

/**
 * Context for GPA calculator frontend
 */
export type GPACalculatorContext = {
  currentGpa: number;
  completedCredits: number;
  completedQualityPoints: number;
  remaining: RemainingCourseDTO[];
  gradPlanId: string;
};

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own data only)
 * Fetch context for GPA calculator
 * Returns completed GPA stats and remaining courses from grad plan
 * @param supabaseClient - Supabase client (server or browser)
 * @param userId - User ID (profile_id)
 * @returns GPA calculator context or null if no transcript
 * @throws NoTranscriptError if user has no synced transcript
 */
export async function getGpaCalculatorContext(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<GPACalculatorContext> {
  try {
    // Fetch user's completed courses from transcript
    const parsedCourses = await fetchUserCoursesArray(supabaseClient, userId);

    // Filter to only completed courses (those with grades, excluding P/NP/W/AU)
    const completedCourses = parsedCourses.filter((course): course is ParsedCourse & { grade: string } => {
      if (!course.grade) return false;
      const gradeUpper = course.grade.toUpperCase();
      // Exclude P/NP, W, AU, In Progress
      if (['P', 'NP', 'W', 'AU', 'IN PROGRESS'].includes(gradeUpper)) {
        return false;
      }
      return true;
    });

    // Check if student has any completed courses
    if (completedCourses.length === 0) {
      logInfo('User has no completed courses - cannot generate GPA context', {
        userId,
        action: 'no_completed_courses',
      });
      throw new NoTranscriptError();
    }

    // Map to grade-bearing rows for calculation
    const gradeRows = completedCourses
      .filter((c): c is ParsedCourse & { credits: number; grade: string } =>
        typeof c.credits === 'number' && c.credits > 0
      )
      .map((course) => ({
        credits: course.credits,
        grade: course.grade.toUpperCase() as GradeKey,
      }));

    // Compute totals
    const { completedCredits, completedQualityPoints, currentGpa } =
      computeTotalsFromTranscript(gradeRows);

    // Create a set of completed course codes for filtering
    const completedCourseCodes = new Set(
      completedCourses.map((c) => `${c.subject} ${c.number}`.trim().toUpperCase())
    );

    // Fetch active grad plan for remaining courses
    const gradPlan = await GetActiveGradPlan(userId);

    // Extract remaining courses from plan_details
    const remaining: RemainingCourseDTO[] = [];
    if (gradPlan?.plan_details && typeof gradPlan.plan_details === 'object') {
      const planObj = gradPlan.plan_details as Record<string, unknown>;

      // Assuming plan_details has a structure with terms and courses
      // This will depend on your actual plan structure
      if (Array.isArray(planObj.plan)) {
        const terms = planObj.plan as Array<{ term?: string; courses?: Array<{ code?: string; title?: string; credits?: number; goalGrade?: string }> }>;

        for (const termObj of terms) {
          if (Array.isArray(termObj.courses)) {
            for (const course of termObj.courses) {
              if (course.code && course.title && typeof course.credits === 'number' && course.credits > 0) {
                // Only include courses that haven't been completed yet
                if (!completedCourseCodes.has(course.code.toUpperCase())) {
                  remaining.push({
                    courseCode: course.code,
                    title: course.title,
                    credits: course.credits,
                    goalGrade: course.goalGrade ? (course.goalGrade as GradeKey | null) : null,
                    termName: termObj.term,
                  });
                }
              }
            }
          }
        }
      }
    }

    logInfo('Generated GPA calculator context', {
      userId,
      action: 'get_gpa_context',
      count: remaining.length,
    });

    return {
      currentGpa,
      completedCredits,
      completedQualityPoints,
      remaining,
      gradPlanId: gradPlan?.id || 'unknown',
    };
  } catch (error) {
    if (error instanceof NoTranscriptError) {
      throw error;
    }
    logError('Failed to get GPA calculator context', error, {
      userId,
      action: 'get_gpa_context_error',
    });
    throw new GPACalculationError('Failed to fetch GPA context', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Compute required grade distribution for target GPA
 * @param payload - Distribution request with target GPA, completed stats, and remaining courses
 * @returns Distribution result with feasibility and required grades
 * @throws ValidationError if input is invalid
 * @throws GPACalculationError if computation fails
 */
export async function computeDistribution(payload: unknown): Promise<{
  feasible: boolean;
  requiredAvg: number;
  qualityPointsNeeded: number;
  distribution: Record<GradeKey, number>;
  message?: string;
}> {
  try {
    // Validate input
    const validated = validateDistributionRequest(payload);

    // Convert remaining courses to internal format
    const remaining: RemainingCourse[] = validated.remaining.map((course) => ({
      id: course.id,
      credits: course.credits,
      goalGrade: course.goalGrade || undefined,
    }));

    // Compute distribution
    const result = distributionForTarget(
      validated.completedCredits,
      validated.completedQualityPoints,
      remaining,
      validated.targetGpa
    );

    logInfo('Computed GPA distribution', {
      action: 'compute_distribution',
      status: result.feasible ? 'feasible' : 'infeasible',
    });

    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logError('Failed to compute distribution', error, {
      action: 'compute_distribution_error',
    });
    throw new GPACalculationError('Failed to compute distribution', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own plan only)
 * Set a goal grade on a course in the grad plan
 * Updates the plan_details JSONB with the goal grade
 * @param supabaseClient - Supabase client
 * @param userId - User ID (profile_id)
 * @param gradPlanId - Grad plan ID
 * @param courseIndex - Index of course in plan (for identification)
 * @param courseCode - Course code for identification
 * @param goalGrade - Goal grade to set (or null to clear)
 * @returns Success status and the set goal grade
 */
export async function setGoalGradeOnCourse(
  supabaseClient: SupabaseClient,
  userId: string,
  gradPlanId: string,
  courseCode: string,
  goalGrade: GradeKey | null
): Promise<{ success: boolean; goalGrade: GradeKey | null; error?: string }> {
  try {
    // Fetch current plan
    const { data: planData, error: fetchError } = await supabaseClient
      .from('grad_plan')
      .select('plan_details')
      .eq('id', gradPlanId)
      .single();

    if (fetchError) {
      throw new GPACalculationError('Failed to fetch grad plan', fetchError);
    }

    if (!planData?.plan_details || typeof planData.plan_details !== 'object') {
      throw new GPACalculationError('Grad plan has no plan details');
    }

    // Parse and update plan details
    const planObj = planData.plan_details as Record<string, unknown>;
    if (!Array.isArray(planObj.plan)) {
      throw new GPACalculationError('Plan structure is invalid');
    }

    const updatedPlan = { ...planObj };
    const terms = (updatedPlan.plan as Array<{ courses?: Array<Record<string, unknown>> }>);
    let found = false;

    // Find and update the course
    for (const term of terms) {
      if (Array.isArray(term.courses)) {
        for (const course of term.courses) {
          if (typeof course === 'object' && course.code === courseCode) {
            course.goalGrade = goalGrade;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    if (!found) {
      throw new GPACalculationError(`Course with code ${courseCode} not found in plan`);
    }

    // Update plan in database
    const { error: updateError } = await supabaseClient
      .from('grad_plan')
      .update({ plan_details: updatedPlan })
      .eq('id', gradPlanId);

    if (updateError) {
      throw new GPACalculationError('Failed to update goal grade', updateError);
    }

    logInfo('Set goal grade on course', {
      userId,
      action: 'set_goal_grade',
      status: goalGrade ? 'set' : 'cleared',
    });

    return {
      success: true,
      goalGrade,
    };
  } catch (error) {
    if (error instanceof GPACalculationError) {
      throw error;
    }
    logError('Failed to set goal grade', error, {
      userId,
      action: 'set_goal_grade_error',
    });
    return {
      success: false,
      goalGrade: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

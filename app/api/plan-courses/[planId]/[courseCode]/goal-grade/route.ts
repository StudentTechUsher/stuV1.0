/**
 * POST /api/plan-courses/[planId]/[courseCode]/goal-grade
 * Sets goal grade on a course in grad plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { logError } from '@/lib/logger';
import {
  setGoalGradeOnCourse,
  GPACalculationError,
} from '@/lib/services/gpaService';
import { UpdateGoalGradeSchema } from '@/lib/validation/zodSchemas';
import {
  validateRequest,
  ValidationError as ZodValidationError,
  formatValidationError,
} from '@/lib/validation/validationUtils';

/**
 * Set goal grade on a course
 * Body should contain: { goalGrade: "A" | "A-" | ... | "E" | null }
 */
async function handleSetGoalGrade(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; courseCode: string }> }
) {
  try {
    // Create server-side Supabase client with user's session from cookies
    const supabase = await createServerSupabase();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    const validatedData = validateRequest(UpdateGoalGradeSchema, body);
    const { goalGrade } = validatedData;

    // Await params and decode the course code
    const { planId, courseCode } = await params;
    const decodedCourseCode = decodeURIComponent(courseCode);

    // Set goal grade
    const result = await setGoalGradeOnCourse(
      supabase,
      user.id,
      planId,
      decodedCourseCode,
      goalGrade as any
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to set goal grade' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goalGrade: result.goalGrade });
  } catch (error) {
    if (error instanceof ZodValidationError) {
      return NextResponse.json(formatValidationError(error), { status: 400 });
    }

    if (error instanceof GPACalculationError) {
      logError('GPA goal grade error', error, {
        action: 'set_goal_grade_api',
      });
      return NextResponse.json(
        { error: 'Failed to set goal grade' },
        { status: 500 }
      );
    }

    logError(
      'Unexpected error in POST /api/plan-courses/[planId]/[courseCode]/goal-grade',
      error,
      {
        action: 'set_goal_grade_api',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; courseCode: string }> }
) {
  return handleSetGoalGrade(request, { params });
}

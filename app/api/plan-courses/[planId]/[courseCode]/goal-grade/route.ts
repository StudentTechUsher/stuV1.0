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
import { ValidationError, validateGrade } from '@/lib/gpa/validation';

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

    // Parse and validate request body
    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    // Validate goal grade
    let goalGrade: string | null;
    try {
      goalGrade = validateGrade(bodyObj.goalGrade);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

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

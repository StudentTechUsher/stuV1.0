import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { updateGradPlanNameWithUniquenessCheck, DuplicatePlanNameError, GradPlanFetchError } from '@/lib/services/gradPlanService';

/**
 * PUT /api/plans/:planId/name
 * Updates a graduation plan's name with uniqueness validation
 *
 * Request body: { name: string, ownerId: string }
 * Response: { name: string } on success
 */
async function handleUpdatePlanName(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId') || (request.url.split('/').slice(-3, -1))[0];

    // Extract planId from the URL path more reliably
    const pathParts = request.nextUrl.pathname.split('/');
    const planIdIndex = pathParts.indexOf('plans');
    const actualPlanId = planIdIndex !== -1 ? pathParts[planIdIndex + 1] : null;

    if (!actualPlanId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const { name } = body;

    if (typeof name !== 'string' || !name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get the current user session
    const supabase = await createSupabaseServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the student record for the current user
    const { data: studentData, error: studentError } = await supabase
      .from('student')
      .select('id')
      .eq('profile_id', session.user.id)
      .single();

    if (studentError || !studentData) {
      console.error('Error fetching student record:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const studentId = studentData.id;

    // Verify the plan belongs to this student
    const { data: planData, error: planError } = await supabase
      .from('grad_plan')
      .select('student_id')
      .eq('id', actualPlanId)
      .single();

    if (planError || !planData) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (planData.student_id !== studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the plan name with uniqueness check
    try {
      const updatedName = await updateGradPlanNameWithUniquenessCheck(
        actualPlanId,
        studentId,
        name
      );

      return NextResponse.json({ name: updatedName }, { status: 200 });
    } catch (error) {
      if (error instanceof DuplicatePlanNameError) {
        return NextResponse.json(
          { code: 'DUPLICATE_NAME', message: error.message },
          { status: 409 }
        );
      }

      if (error instanceof GradPlanFetchError) {
        console.error('GradPlanFetchError:', error);
        return NextResponse.json(
          { error: 'Failed to update plan name' },
          { status: 400 }
        );
      }

      // Handle other validation errors
      if (error instanceof Error) {
        if (error.message.includes('cannot be empty')) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error.message.includes('must be ≤')) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }

      throw error;
    }
  } catch (error) {
    console.error('Error in handleUpdatePlanName:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdatePlanName(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'PUT, OPTIONS',
    },
  });
}

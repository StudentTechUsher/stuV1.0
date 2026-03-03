import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { updateGradPlanNameWithUniquenessCheck, DuplicatePlanNameError, GradPlanFetchError } from '@/lib/services/gradPlanService';
import { UpdatePlanNameSchema } from '@/lib/validation/zodSchemas';
import { validateRequest, ValidationError, formatValidationError } from '@/lib/validation/validationUtils';

/**
 * PUT /api/plans/:planId/name
 * Updates a graduation plan's name with uniqueness validation
 *
 * Request body: { name: string, ownerId: string }
 * Response: { name: string } on success
 */
async function handleUpdatePlanName(request: NextRequest) {
  try {
    // Extract planId from the URL path more reliably
    const pathParts = request.nextUrl.pathname.split('/');
    const planIdIndex = pathParts.indexOf('plans');
    const actualPlanId = planIdIndex !== -1 ? pathParts[planIdIndex + 1] : null;

    if (!actualPlanId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const body = await request.json();

    // Validate request body with Zod
    const validatedData = validateRequest(UpdatePlanNameSchema, body);
    const { name } = validatedData;

    // Get the current user session
    const supabase = await createSupabaseServerComponentClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the plan belongs to this user
    const { data: planData, error: planError } = await supabase
      .from('grad_plan')
      .select('profile_id')
      .eq('id', actualPlanId)
      .single();

    if (planError || !planData) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (planData.profile_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the plan name with uniqueness check
    try {
      const updatedName = await updateGradPlanNameWithUniquenessCheck(
        actualPlanId,
        session.user.id,
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
    if (error instanceof ValidationError) {
      return NextResponse.json(formatValidationError(error), { status: 400 });
    }

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

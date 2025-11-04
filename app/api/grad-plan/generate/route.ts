import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { OrganizeCoursesIntoSemesters_ServerAction } from '@/lib/services/openaiService';
import { updateGradPlanName } from '@/lib/services/gradPlanService';
import {
  courseSelectionPayloadSchema,
  organizePromptInputSchema,
  VALIDATION_OPTIONS
} from '@/lib/validation/schemas';

/**
 * POST /api/grad-plan/generate
 *
 * Generates a graduation plan using AI. This runs asynchronously so the client
 * can disconnect and the processing will continue. Notifications are sent when complete.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { coursesData, promptInput, planName } = body;

    // Validate inputs
    let validatedCourses, validatedPrompt;
    try {
      [validatedCourses, validatedPrompt] = await Promise.all([
        courseSelectionPayloadSchema.validate(coursesData, VALIDATION_OPTIONS),
        organizePromptInputSchema.validate(promptInput, VALIDATION_OPTIONS),
      ]);
    } catch (validationError) {
      return NextResponse.json(
        { success: false, message: `Validation error: ${validationError}` },
        { status: 400 }
      );
    }

    // Process the grad plan generation
    // Note: We await this so the process completes before the API route terminates
    console.log('🚀 Starting grad plan generation...');
    await processGradPlanGeneration(user.id, validatedCourses, validatedPrompt, planName);
    console.log('✅ Grad plan generation completed');

    // Return success to client
    return NextResponse.json({
      success: true,
      message: 'Graduation plan generation started. You will be notified when complete.'
    });

  } catch (error) {
    console.error('❌ Error in grad-plan generate API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Background processing function that continues even if client disconnects
 */
async function processGradPlanGeneration(
  userId: string,
  coursesData: unknown,
  promptInput: unknown,
  planName?: string
) {
  try {
    console.log(`🚀 processGradPlanGeneration: Starting for user ${userId}`);
    console.log(`📝 processGradPlanGeneration: planName = ${planName || '(none)'}`);

    // Call the AI service to generate the plan
    console.log(`🤖 processGradPlanGeneration: Calling OrganizeCoursesIntoSemesters_ServerAction...`);
    const result = await OrganizeCoursesIntoSemesters_ServerAction(coursesData, promptInput);
    console.log(`🤖 processGradPlanGeneration: OrganizeCoursesIntoSemesters_ServerAction returned:`, {
      success: result.success,
      accessId: result.accessId,
      message: result.message
    });

    if (!result.success || !result.accessId) {
      console.error('❌ processGradPlanGeneration: AI generation failed:', result.message);
      return;
    }

    console.log(`✅ processGradPlanGeneration: Grad plan generated successfully with accessId: ${result.accessId}`);

    // Update plan name if provided
    if (planName && planName.trim() && result.accessId) {
      // The accessId is an encoded version of the grad plan ID
      // We need to decode it first
      const { decodeAnyAccessId } = await import('@/lib/utils/access-id');
      const gradPlanId = decodeAnyAccessId(result.accessId);

      if (gradPlanId) {
        const renameResult = await updateGradPlanName(gradPlanId, planName.trim());
        if (renameResult.success) {
          console.log(`✅ Plan name updated: ${planName}`);
        } else {
          console.warn(`⚠️ Failed to update plan name:`, renameResult.error);
        }
      } else {
        console.warn(`⚠️ Could not decode accessId: ${result.accessId}`);
      }
    }

    console.log(`📧 Notification and email sent to user ${userId}`);
    // Note: Notification and email are automatically sent by InsertGeneratedGradPlan

  } catch (error) {
    console.error('❌ Error in background grad plan generation:', error);
  }
}

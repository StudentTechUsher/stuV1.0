import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  completeOnboarding,
} from '@/lib/services/profileService.server';
import { ProfileUpdateError } from '@/lib/services/errors/profileErrors';
import { logError } from '@/lib/logger';
import { OnboardingSchema } from '@/lib/validation/zodSchemas';
import { validateRequest, ValidationError, formatValidationError } from '@/lib/validation/validationUtils';

export async function POST(request: NextRequest) {
  return handleCompleteOnboarding(request);
}

async function handleCompleteOnboarding(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validatedData = validateRequest(OnboardingSchema, body);

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Update the profile using service layer with validated data
    const { university_id, role, fname, lname, email, est_grad_sem, est_grad_date } = validatedData;
    const resolvedEmail = email ?? user.email ?? undefined;
    await completeOnboarding(
      user.id,
      university_id,
      role,
      fname,
      lname,
      resolvedEmail,
      est_grad_sem,
      est_grad_date
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(formatValidationError(error), { status: 400 });
    }

    if (error instanceof ProfileUpdateError) {
      logError('Failed to complete onboarding', error, {
        action: 'complete_onboarding',
      });
      return NextResponse.json(
        { success: false, error: 'Failed to save university selection' },
        { status: 500 }
      );
    }

    logError('Unexpected error in onboarding completion', error, {
      action: 'complete_onboarding',
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  completeOnboarding,
  ProfileUpdateError,
} from '@/lib/services/profileService.server';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return handleCompleteOnboarding(request);
}

async function handleCompleteOnboarding(request: NextRequest) {
  try {
    const body = await request.json();
    const { university_id } = body;

    if (!university_id || typeof university_id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'University ID is required' },
        { status: 400 }
      );
    }

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

    // Update the profile using service layer
    await completeOnboarding(user.id, university_id);

    return NextResponse.json({ success: true });
  } catch (error) {
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
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isValidSem } from '@/lib/gradDate';
import {
  updateProfile,
  ProfileUpdateError,
} from '@/lib/services/profileService.server';
import { logError } from '@/lib/logger';

/**
 * PATCH /api/profile
 * Update user profile fields (graduation timeline & career goals)
 */
export async function PATCH(request: NextRequest) {
  return handleUpdateProfile(request);
}

async function handleUpdateProfile(request: NextRequest) {
  try {
    // Create Supabase client for API routes
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

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { est_grad_sem, est_grad_date, career_goals } = body;

    // Validation
    const updates: Record<string, string | null> = {};

    if (est_grad_sem !== undefined) {
      if (est_grad_sem !== null && typeof est_grad_sem !== 'string') {
        return NextResponse.json({ error: 'est_grad_sem must be a string' }, { status: 400 });
      }
      if (est_grad_sem !== null && !isValidSem(est_grad_sem)) {
        return NextResponse.json(
          { error: 'est_grad_sem must be in format "Fall 2026", "Spring 2027", etc.' },
          { status: 400 }
        );
      }
      updates.est_grad_sem = est_grad_sem;
    }

    if (est_grad_date !== undefined) {
      if (est_grad_date !== null && typeof est_grad_date !== 'string') {
        return NextResponse.json(
          { error: 'est_grad_date must be an ISO date string (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      // Basic ISO date validation
      if (est_grad_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(est_grad_date)) {
        return NextResponse.json(
          { error: 'est_grad_date must be in format YYYY-MM-DD' },
          { status: 400 }
        );
      }
      updates.est_grad_date = est_grad_date;
    }

    if (career_goals !== undefined) {
      if (career_goals !== null && typeof career_goals !== 'string') {
        return NextResponse.json({ error: 'career_goals must be a string' }, { status: 400 });
      }
      if (career_goals !== null && career_goals.length > 1000) {
        return NextResponse.json(
          { error: 'career_goals must be 1000 characters or less' },
          { status: 400 }
        );
      }
      updates.career_goals = career_goals;
    }

    // Nothing to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    // Update profile using service layer
    await updateProfile(user.id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      logError('Failed to update profile', error, {
        action: 'update_profile',
      });
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    logError('Unexpected error in profile update', error, {
      action: 'update_profile',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

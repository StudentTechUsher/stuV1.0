import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  fetchMyProfile,
  ProfileNotFoundError,
  ProfileFetchError,
} from '@/lib/services/profileService.server';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return handleGetMyProfile(request);
}

async function handleGetMyProfile(request: NextRequest) {
  try {
    // Create Supabase client with proper cookie handling
    const response = NextResponse.next();
    const supabase = createSupabaseServerClient(request, response);

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's profile using service layer
    const profile = await fetchMyProfile(user.id);

    // Return the profile data
    return NextResponse.json({
      id: profile.id,
      university_id: profile.university_id,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      // Add other profile fields as needed
    });
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (error instanceof ProfileFetchError) {
      logError('Failed to fetch profile', error, {
        action: 'fetch_my_profile',
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    logError('Unexpected error in my-profile route', error, {
      action: 'fetch_my_profile',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

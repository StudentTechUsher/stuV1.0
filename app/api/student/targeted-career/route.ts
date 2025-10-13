import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import {
  updateStudentTargetedCareer,
} from '@/lib/services/profileService.server';
import { ProfileUpdateError } from '@/lib/services/errors/profileErrors';
import { logError } from '@/lib/logger';

export async function POST(req: Request) {
  return handleUpdateTargetedCareer(req);
}

async function handleUpdateTargetedCareer(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const careerTitle = typeof body.careerTitle === 'string' ? body.careerTitle.trim() : '';

    if (!careerTitle) {
      return NextResponse.json({ error: 'Invalid careerTitle' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update targeted career using service layer
    await updateStudentTargetedCareer(user.id, careerTitle);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      logError('Failed to update targeted career', error, {
        action: 'update_targeted_career',
      });
      return NextResponse.json({ error: 'Failed to update targeted career' }, { status: 500 });
    }

    logError('Unexpected error updating targeted career', error, {
      action: 'update_targeted_career',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
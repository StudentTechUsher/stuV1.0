import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SELECTION_MODES, type SelectionMode } from '@/lib/selectionMode';
import {
  fetchInstitutionSettings,
  updateInstitutionSettings,
} from '@/lib/services/institutionService';
import {
  InstitutionFetchError,
  InstitutionUpdateError,
  InstitutionUnauthorizedError,
} from '@/lib/services/errors/institutionErrors';
import { logError } from '@/lib/logger';

// GET /api/institutions/[universityId]/settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ universityId: string }> }
) {
  return handleGetInstitutionSettings(request, params);
}

// PATCH /api/institutions/[universityId]/settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ universityId: string }> }
) {
  return handleUpdateInstitutionSettings(request, params);
}

async function handleGetInstitutionSettings(
  request: NextRequest,
  params: Promise<{ universityId: string }>
) {
  try {
    const { universityId } = await params;
    const universityIdNum = parseInt(universityId, 10);

    if (isNaN(universityIdNum)) {
      return NextResponse.json({ error: 'Invalid university ID' }, { status: 400 });
    }

    const response = NextResponse.next();
    const supabase = createSupabaseServerClient(request, response);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch settings using service layer
    const settings = await fetchInstitutionSettings(universityIdNum);

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    if (error instanceof InstitutionFetchError) {
      logError('Failed to fetch institution settings', error, {
        action: 'fetch_institution_settings',
      });
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    logError('Unexpected error fetching institution settings', error, {
      action: 'fetch_institution_settings',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUpdateInstitutionSettings(
  request: NextRequest,
  params: Promise<{ universityId: string }>
) {
  try {
    const { universityId } = await params;
    const universityIdNum = parseInt(universityId, 10);

    if (isNaN(universityIdNum)) {
      return NextResponse.json({ error: 'Invalid university ID' }, { status: 400 });
    }

    const response = NextResponse.next();
    const supabase = createSupabaseServerClient(request, response);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const { selection_mode } = body;

    if (!selection_mode || !SELECTION_MODES.includes(selection_mode as SelectionMode)) {
      return NextResponse.json(
        { error: 'Invalid selection_mode. Must be AUTO, MANUAL, or CHOICE.' },
        { status: 400 }
      );
    }

    // Update settings using service layer
    const updatedSettings = await updateInstitutionSettings(
      universityIdNum,
      selection_mode,
      user.id
    );

    return NextResponse.json(updatedSettings, { status: 200 });
  } catch (error) {
    if (error instanceof InstitutionUnauthorizedError) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (error instanceof InstitutionUpdateError) {
      logError('Failed to update institution settings', error, {
        action: 'update_institution_settings',
      });
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    logError('Unexpected error updating institution settings', error, {
      action: 'update_institution_settings',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
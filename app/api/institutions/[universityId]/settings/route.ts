import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { coerceSelectionMode, SELECTION_MODES, type SelectionMode } from '@/lib/selectionMode';

// GET /api/institutions/[universityId]/settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ universityId: string }> }
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

    // Fetch settings (RLS will enforce membership check)
    const { data: settings, error } = await supabase
      .from('institution_settings')
      .select('selection_mode')
      .eq('university_id', universityIdNum)
      .single();

    if (error) {
      // If no settings exist, return default
      if (error.code === 'PGRST116') {
        return NextResponse.json({ selection_mode: 'MANUAL' }, { status: 200 });
      }
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({
      selection_mode: coerceSelectionMode(settings?.selection_mode)
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/institutions/[universityId]/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/institutions/[universityId]/settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ universityId: string }> }
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

    // Upsert settings (RLS will enforce admin check)
    const { data, error } = await supabase
      .from('institution_settings')
      .upsert(
        {
          university_id: universityIdNum,
          selection_mode,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        },
        { onConflict: 'university_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Settings update error:', error);
      // If it's a policy violation, the user is not an admin
      if (error.code === '42501' || error.message?.includes('policy')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({
      selection_mode: data.selection_mode,
      updated_at: data.updated_at
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH /api/institutions/[universityId]/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

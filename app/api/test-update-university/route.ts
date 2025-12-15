import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, colors } = body;

    console.log('Test update API called with:', { universityId, colors });

    // Try with service role key first (has full permissions, bypasses RLS)
    const { createClient } = await import('@supabase/supabase-js');

    let supabase: SupabaseClient;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey) {
      console.log('Using service role key (has full permissions)');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      );
    } else {
      console.log('Service role key not available, using anon key');
      // Fallback to anon key with cookies
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {
                // Ignore cookie setting errors in server routes
              }
            },
          },
        }
      );
    }

    // First, verify we can read the university
    console.log('Fetching university with ID:', universityId);
    const { data: university, error: fetchError } = await supabase
      .from('university')
      .select('*')
      .eq('id', universityId)
      .single();

    if (fetchError) {
      console.error('Error fetching university:', fetchError);
      return NextResponse.json(
        { error: 'Could not fetch university', details: fetchError },
        { status: 400 }
      );
    }

    console.log('University found:', university);

    // Now try to update
    console.log('Attempting to update with colors:', colors);

    // Try a simple update first without .select()
    const { error: updateError } = await supabase
      .from('university')
      .update(colors)
      .eq('id', universityId);

    console.log('Update error:', updateError);

    if (updateError) {
      console.error('Error updating university:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update university',
          details: updateError,
          input: { universityId, colors },
        },
        { status: 500 }
      );
    }

    console.log('Update command completed (no error)');

    // Verify the update worked by fetching again
    const { data: verifyData, error: verifyError } = await supabase
      .from('university')
      .select('*')
      .eq('id', universityId)
      .single();

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
    } else {
      console.log('Verification fetch result:', verifyData);
    }

    return NextResponse.json({
      success: true,
      message: 'Update successful',
      verifyData,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

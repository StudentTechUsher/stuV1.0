import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, colors } = body;

    console.log('Test update API called with:', { universityId, colors });

    // Create server-side Supabase client
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
    const { data: updateData, error: updateError } = await supabase
      .from('university')
      .update(colors)
      .eq('id', universityId)
      .select();

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

    console.log('Update successful:', updateData);

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
      updateData,
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

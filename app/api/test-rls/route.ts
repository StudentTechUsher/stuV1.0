import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TEST ENDPOINT: Bypasses RLS using service role key to test if RLS is blocking column writes
 */
export async function POST(request: NextRequest) {
  try {
    // Create admin client using service role key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials', details: { hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey } },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    console.log('🧪 TEST: Using ADMIN client (bypasses RLS)');

    // Delete old record
    const { error: deleteError } = await supabaseAdmin
      .from('user_courses')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('❌ Delete failed:', deleteError);
      return NextResponse.json({ error: deleteError }, { status: 500 });
    }

    console.log('✅ Delete successful');

    // Insert with test data using ADMIN client
    const testPayload = {
      user_id,
      courses: [
        {
          id: 'test-1',
          subject: 'CS',
          number: '100',
          title: 'Test Course',
          credits: 3,
          grade: 'A',
          term: 'Spring 2025',
          tags: [],
          origin: 'parsed',
          status: 'completed' as const,
        },
      ],
      term_metrics: [
        {
          term: 'Spring 2025',
          hoursEarned: 12,
          hoursGraded: 12,
          termGpa: 3.8,
        },
      ],
      exam_credits: [
        {
          type: 'AP',
          subject: 'Computer Science',
          score: 5,
          equivalent: 'CS 100',
          hours: 3,
          grade: 'P',
        },
      ],
      entrance_exams: [
        {
          name: 'ACT',
          scoreType: 'COMP',
          score: 32,
          date: '06/2023',
        },
      ],
    };

    console.log('📤 Inserting test payload with ADMIN client...');
    const { error: insertError } = await supabaseAdmin
      .from('user_courses')
      .insert(testPayload);

    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      return NextResponse.json({ error: insertError }, { status: 500 });
    }

    console.log('✅ Insert successful');

    // Verify with ADMIN client
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('user_courses')
      .select('term_metrics, exam_credits, entrance_exams')
      .eq('user_id', user_id)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return NextResponse.json({ error: verifyError }, { status: 500 });
    }

    console.log('✅ ADMIN INSERT VERIFIED DATA:', verifyData);

    return NextResponse.json({
      success: true,
      message: 'If this shows data, RLS is blocking the regular client writes',
      data: verifyData,
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

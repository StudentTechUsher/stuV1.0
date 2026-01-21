import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { fetchStudentPlanningData } from '@/lib/services/studentService';

/**
 * GET /api/student/planning-data
 * Fetch student planning data (graduation date, student type, etc.)
 */
export async function GET() {
  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentData = await fetchStudentPlanningData(supabase, user.id);

    return NextResponse.json({ data: studentData });
  } catch (error) {
    console.error('Error fetching student planning data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student planning data' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/student/planning-data
 * Update student planning data
 */
export async function PATCH(request: Request) {
  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      est_grad_date,
      est_grad_term,
      admission_year,
      student_type,
      career_goals,
      is_transfer,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (est_grad_date !== undefined) updates.est_grad_date = est_grad_date;
    if (est_grad_term !== undefined) updates.est_grad_term = est_grad_term;
    if (admission_year !== undefined) updates.admission_year = admission_year;
    if (student_type !== undefined) updates.student_type = student_type;
    if (career_goals !== undefined) updates.career_goals = career_goals;
    if (is_transfer !== undefined) updates.is_transfer = is_transfer;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update student table
    const { error: updateError } = await supabase
      .from('student')
      .update(updates)
      .eq('profile_id', user.id);

    if (updateError) {
      console.error('Error updating student:', updateError);
      return NextResponse.json(
        { error: 'Failed to update student data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating student planning data:', error);
    return NextResponse.json(
      { error: 'Failed to update student planning data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

type CourseInput = {
  id?: string; // Optional: if updating existing course
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade?: string | null;
  source_document?: string | null;
  confidence?: number | null;
};

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createSupabaseServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { courses } = await request.json() as { courses: CourseInput[] };

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json(
        { error: 'No courses provided' },
        { status: 400 }
      );
    }

    // 3. Validate course data
    for (const course of courses) {
      if (!course.term || !course.subject || !course.number || !course.title) {
        return NextResponse.json(
          { error: 'Missing required course fields' },
          { status: 400 }
        );
      }

      if (typeof course.credits !== 'number' || course.credits <= 0) {
        return NextResponse.json(
          { error: 'Invalid credits value' },
          { status: 400 }
        );
      }
    }

    // 4. Prepare records for upsert
    const records = courses.map((course) => ({
      user_id: user.id,
      term: course.term,
      subject: course.subject,
      number: course.number,
      title: course.title,
      credits: course.credits,
      grade: course.grade || null,
      source_document: course.source_document || null,
      confidence: course.confidence || null,
    }));

    // 5. Bulk upsert courses
    const { data, error: upsertError } = await supabase
      .from('user_courses')
      .upsert(records, {
        onConflict: 'user_id,subject,number,term',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error('Bulk upsert error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save courses' },
        { status: 500 }
      );
    }

    // 6. Return success
    return NextResponse.json({
      success: true,
      coursesProcessed: data?.length || 0,
      courses: data,
    });

  } catch (error) {
    console.error('Bulk upsert error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

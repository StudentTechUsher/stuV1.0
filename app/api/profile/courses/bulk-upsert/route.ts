import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import {
  bulkUpsertCourses,
  CourseUpsertError,
  type CourseInput,
} from '@/lib/services/transcriptService';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return handleBulkUpsertCourses(request);
}

async function handleBulkUpsertCourses(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { courses } = (await request.json()) as { courses: CourseInput[] };

    // Bulk upsert courses using service layer
    const result = await bulkUpsertCourses(user.id, courses);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CourseUpsertError) {
      logError('Failed to bulk upsert courses', error, {
        action: 'bulk_upsert_courses',
      });

      // Return specific error messages for validation errors
      if (error.message.includes('No courses provided')) {
        return NextResponse.json({ error: 'No courses provided' }, { status: 400 });
      }
      if (
        error.message.includes('Missing required course fields') ||
        error.message.includes('Invalid credits value')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ error: 'Failed to save courses' }, { status: 500 });
    }

    logError('Unexpected error in bulk upsert', error, {
      action: 'bulk_upsert_courses',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
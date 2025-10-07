import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client to bypass RLS for trusted webhook data
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type ParsedCourse = {
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade?: string;
  confidence?: number;
};

type TranscriptParsedEvent = {
  type: 'user.transcript.parsed';
  userId: string;
  documentId: string;
  courses: ParsedCourse[];
};

export async function POST(request: NextRequest) {
  try {
    // 1. Validate webhook secret
    const signature = request.headers.get('x-stu-signature');
    const expectedSecret = process.env.TRANSCRIPT_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('TRANSCRIPT_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    if (signature !== expectedSecret) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse event payload
    const event = (await request.json()) as TranscriptParsedEvent;

    // 3. Validate event type
    if (event.type !== 'user.transcript.parsed') {
      return NextResponse.json(
        { error: 'Unknown event type' },
        { status: 400 }
      );
    }

    // 4. Validate required fields
    if (!event.userId || !event.documentId || !event.courses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 5. Create service role client
    const supabase = createServiceRoleClient();

    // 6. Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', event.documentId)
      .eq('user_id', event.userId)
      .single();

    if (docError || !document) {
      console.error('Document not found or access denied:', docError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 7. Prepare course records
    const courseRecords = event.courses.map((course) => ({
      user_id: event.userId,
      term: course.term,
      subject: course.subject,
      number: course.number,
      title: course.title,
      credits: course.credits,
      grade: course.grade || null,
      source_document: event.documentId,
      confidence: course.confidence || null,
    }));

    // 8. Upsert courses (insert or update based on unique constraint)
    const { error: upsertError } = await supabase
      .from('user_courses')
      .upsert(courseRecords, {
        onConflict: 'user_id,subject,number,term',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Failed to upsert courses:', upsertError);

      // Update document status to failed
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', event.documentId);

      return NextResponse.json(
        { error: 'Failed to save courses' },
        { status: 500 }
      );
    }

    // 9. Update document status to parsed
    const { error: statusError } = await supabase
      .from('documents')
      .update({ status: 'parsed' })
      .eq('id', event.documentId);

    if (statusError) {
      console.error('Failed to update document status:', statusError);
      // Don't fail the request - courses are already saved
    }

    // 10. Return success
    return NextResponse.json({
      success: true,
      coursesProcessed: courseRecords.length,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

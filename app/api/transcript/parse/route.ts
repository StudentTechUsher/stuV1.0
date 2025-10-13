import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { parseTranscriptFromBuffer } from '@/lib/transcript/processor';
import { logError } from '@/lib/logger';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerComponentClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  let buffer: Buffer;
  let fileName: string;

  try {
    if (isMultipart) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.type && file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name;
    } else {
      const arrayBuffer = await request.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = 'transcript.pdf';

      if (buffer.length === 0) {
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
      }

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
      }
    }
  } catch (error) {
    logError('Failed to read transcript upload', error, {
      userId: user.id,
      action: 'transcript_read_upload',
    });

    return NextResponse.json(
      { error: 'Failed to read uploaded file', details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }

  try {
    const report = await parseTranscriptFromBuffer({
      userId: user.id,
      fileBuffer: buffer,
      fileName,
      supabaseClient: supabase,
    });

    if (!report.success) {
      return NextResponse.json(
        { success: false, report },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    logError('Transcript parse route failed', error, {
      userId: user.id,
      action: 'transcript_parse_route',
    });

    const isDev = process.env.NODE_ENV !== 'production';
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to parse transcript',
        details: message,
        ...(isDev && error instanceof Error ? { stack: error.stack } : {}),
      },
      { status: 500 }
    );
  }
}

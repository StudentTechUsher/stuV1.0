import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { uploadPdfToOpenAI, extractCoursesWithOpenAI } from '@/lib/openaiTranscript';
import { logError, logInfo } from '@/lib/logger';

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

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 3. Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // 4. Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // 5. Generate unique storage path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

    // 6. Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('transcripts')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      logError('Storage upload failed', uploadError, {
        userId: user.id,
        action: 'storage_upload',
      });
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // 7. Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        type: 'transcript',
        storage_path: storagePath,
        status: 'uploaded',
      })
      .select()
      .single();

    if (dbError) {
      logError('Database insert failed', dbError, {
        userId: user.id,
        action: 'document_insert',
      });
      // Cleanup: delete uploaded file
      await supabase.storage.from('transcripts').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // 8. Parse transcript using Python parser (or fallback to OpenAI)
    let coursesCount = 0;
    const USE_PYTHON_PARSER = process.env.USE_PYTHON_PARSER !== 'false'; // Default to true

    try {
      // Update status to 'parsing'
      await supabase
        .from('documents')
        .update({ status: 'parsing' })
        .eq('id', document.id);

      if (USE_PYTHON_PARSER) {
        // Use Python FastAPI parser
        const parserUrl = process.env.TRANSCRIPT_PARSER_URL || 'http://localhost:8787';

        try {
          const parseResponse = await fetch(`${parserUrl}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: 'transcripts',
              path: storagePath,
              user_id: user.id,
            }),
          });

          if (!parseResponse.ok) {
            const errorText = await parseResponse.text();
            console.error('[Transcript Upload] Python parser error:', errorText);
            throw new Error(`Python parser failed: ${errorText}`);
          }

          const parseReport = await parseResponse.json();
          logInfo('Python parser completed', {
            userId: user.id,
            action: 'transcript_parse_python',
            count: parseReport.courses_upserted || 0,
          });

          coursesCount = parseReport.courses_upserted || 0;

          // Update document status to 'parsed'
          await supabase
            .from('documents')
            .update({ status: 'parsed' })
            .eq('id', document.id);

        } catch (pythonError) {
          console.error('[Transcript Upload] Python parser failed, falling back to OpenAI:', pythonError);
          // Fall through to OpenAI parsing
          throw pythonError;
        }
      } else {
        // Use OpenAI parser (original implementation)
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );

        // Download PDF bytes from storage
        const { data: downloadData, error: downloadError } = await admin.storage
          .from('transcripts')
          .download(storagePath);

        if (downloadError || !downloadData) {
          throw new Error(`Failed to download PDF: ${downloadError?.message || 'No data'}`);
        }

        const pdfBytes = Buffer.from(await downloadData.arrayBuffer());

        // Upload PDF to OpenAI
        const fileId = await uploadPdfToOpenAI(pdfBytes, `${document.id}.pdf`);
        // Do NOT log fileId - it creates linkage between user and OpenAI

        // Extract courses using OpenAI
        const courses = await extractCoursesWithOpenAI(fileId);
        logInfo('Transcript parsing completed', {
          userId: user.id,
          action: 'transcript_parse',
          count: courses.length,
        });

        // Upsert courses into user_courses table
        for (const course of courses) {
          const { error: upsertError } = await admin.from('user_courses').upsert(
            {
              user_id: user.id,
              term: course.term ?? null,
              subject: course.subject,
              number: course.number,
              title: course.title ?? null,
              credits: course.credits ?? null,
              grade: course.grade ?? null,
              confidence: course.confidence ?? null,
              source_document: document.id,
            },
            { onConflict: 'user_id,subject,number,term' }
          );
          if (upsertError) {
            // CRITICAL: Do NOT log upsertError details - may contain course data (subject, number, grade)
            logError('Course upsert failed', upsertError, {
              userId: user.id,
              action: 'course_upsert',
            });
            throw upsertError;
          }
        }

        // Update document status to 'parsed'
        await admin
          .from('documents')
          .update({ status: 'parsed' })
          .eq('id', document.id);

        coursesCount = courses.length;
      }
    } catch (parseError: unknown) {
      // Mark document as failed
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', document.id);
      logError('Transcript parsing failed', parseError, {
        userId: user.id,
        action: 'transcript_parse_failure',
      });

      // Return failure status to client
      return NextResponse.json({
        documentId: document.id,
        status: 'failed',
        error: 'Failed to parse transcript',
      }, { status: 500 });
    }

    // 9. Return success response
    return NextResponse.json({
      documentId: document.id,
      status: 'parsed',
      count: coursesCount,
    });

  } catch (error) {
    logError('Transcript upload error', error, {
      action: 'transcript_upload',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

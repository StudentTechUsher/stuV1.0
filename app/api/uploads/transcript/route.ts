import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { uploadPdfToOpenAI, extractCoursesWithOpenAI } from '@/lib/openaiTranscript';

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
      console.error('Storage upload error:', uploadError);
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
      console.error('Database insert error:', dbError);
      // Cleanup: delete uploaded file
      await supabase.storage.from('transcripts').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // 8. Parse transcript using OpenAI (synchronous for now)
    let coursesCount = 0;
    try {
      // Update status to 'parsing'
      await supabase
        .from('documents')
        .update({ status: 'parsing' })
        .eq('id', document.id);

      // Create admin client to download the file we just uploaded
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
      console.log('[Transcript Upload] OpenAI file_id:', fileId);

      // Extract courses using OpenAI
      const courses = await extractCoursesWithOpenAI(fileId);
      console.log('[Transcript Upload] Extracted', courses.length, 'courses');

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
          console.error('[Transcript Upload] Upsert error:', upsertError);
          throw upsertError;
        }
      }

      // Update document status to 'parsed'
      await admin
        .from('documents')
        .update({ status: 'parsed' })
        .eq('id', document.id);

      coursesCount = courses.length;
    } catch (parseError: any) {
      // Mark document as failed
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', document.id);
      console.error('[Transcript Upload] Parse failed:', parseError?.message || parseError);

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
    console.error('Transcript upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

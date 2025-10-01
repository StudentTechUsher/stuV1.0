import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { extractTranscriptCourses, upsertCoursesDirect } from '@/lib/parseTranscript';

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

    // 8. Parse transcript immediately (instead of n8n webhook)
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

      // Download the PDF from storage
      const { data: downloadData, error: downloadError } = await admin.storage
        .from('transcripts')
        .download(storagePath);

      if (downloadError) throw downloadError;

      // Convert to Buffer for pdf-parse
      const pdfBytes = Buffer.from(await downloadData.arrayBuffer());

      // Extract courses from PDF
      const courses = await extractTranscriptCourses(pdfBytes);

      // Upsert courses into database + update status to 'parsed'
      await upsertCoursesDirect(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { userId: user.id, documentId: document.id, courses }
      );
    } catch (parseError: any) {
      // Mark document as failed but don't fail the request
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', document.id);
      console.error('Transcript parse failed:', parseError?.message || parseError);
    }

    // 9. Return success response
    return NextResponse.json({
      documentId: document.id,
      status: 'uploaded',
    });

  } catch (error) {
    console.error('Transcript upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

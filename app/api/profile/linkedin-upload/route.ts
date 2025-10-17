import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

/**
 * POST /api/profile/linkedin-upload
 * Uploads a LinkedIn profile PDF and stores the reference in the student's profile
 * AUTHORIZATION: AUTHENTICATED STUDENTS
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `linkedin-profiles/${user.id}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('student-documents')
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // Update student profile with LinkedIn PDF reference
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        linkedin_profile_url: fileUrl,
        linkedin_profile_uploaded_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Don't fail the request if profile update fails - file is still uploaded
      console.warn('LinkedIn PDF uploaded but profile update failed');
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      message: 'LinkedIn profile uploaded successfully',
    });

  } catch (error) {
    console.error('LinkedIn upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

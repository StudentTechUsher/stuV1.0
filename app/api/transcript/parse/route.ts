import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { parseTranscriptFromBuffer } from '@/lib/transcript/processor';
import { logError, logInfo } from '@/lib/logger';
import { calculateGpaFromCourses } from '@/lib/services/gpaCalculationService';
import { updateStudentGpa } from '@/lib/services/studentService';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';

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

  // Check if mode=text (direct text input)
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  if (mode === 'text') {
    // Handle direct text input
    try {
      const body = await request.json();
      const text = body.text;

      if (!text || typeof text !== 'string' || text.trim().length < 100) {
        return NextResponse.json({ error: 'Text must be at least 100 characters' }, { status: 400 });
      }

      // Parse text directly using BYU parser
      const { parseByuTranscriptWithOpenAI } = await import('@/lib/transcript/byuTranscriptParserOpenAI');
      const { deduplicateByuCourses } = await import('@/lib/transcript/byuTranscriptParserOpenAI');
      const { randomUUID } = await import('crypto');

      const byuResult = await parseByuTranscriptWithOpenAI(text, user.id);

      if (byuResult.success && byuResult.courses.length > 0) {
        const dedupedCourses = deduplicateByuCourses(byuResult.courses);

        // Convert to DB format
        const coursesJson = dedupedCourses.map((course) => ({
          id: randomUUID(),
          subject: course.subject,
          number: course.number,
          title: course.title,
          credits: course.credits,
          grade: course.grade.trim() === '' ? null : course.grade,
          term: course.term,
          tags: [],
          origin: 'parsed',
        }));

        // Check if user has existing record
        const { data: existingRecord } = await supabase
          .from('user_courses')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingRecord) {
          await supabase
            .from('user_courses')
            .update({ courses: coursesJson })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_courses')
            .insert({ user_id: user.id, courses: coursesJson });
        }

        // Save GPA from transcript (prefer extracted GPA over calculated)
        try {
          let gpa: number | null = null;

          // Use extracted GPA if available, otherwise calculate from courses
          if (byuResult.gpa !== null && byuResult.gpa !== undefined) {
            gpa = byuResult.gpa;
            logInfo('Using extracted GPA from transcript', {
              userId: user.id,
              action: 'use_extracted_gpa_text_mode',
            });
          } else {
            gpa = calculateGpaFromCourses(dedupedCourses);
            logInfo('Calculated GPA from courses (no GPA found in transcript)', {
              userId: user.id,
              action: 'calculate_gpa_text_mode',
            });
          }

          await updateStudentGpa(supabase, user.id, gpa);
          logInfo('Updated student GPA after text transcript parse', {
            userId: user.id,
            action: 'update_gpa_text_mode',
          });
        } catch (error) {
          // Log error but don't fail the request
          // GPA update is not critical to transcript upload success
          logError('Failed to update student GPA (text mode)', error, {
            userId: user.id,
            action: 'update_gpa_text_mode',
          });
        }

        const termsDetected = Array.from(new Set(dedupedCourses.map(c => c.term)));

        return NextResponse.json({
          success: true,
          report: {
            success: true,
            courses_found: dedupedCourses.length,
            courses_upserted: dedupedCourses.length,
            terms_detected: termsDetected,
            unknown_lines: 0,
            total_lines: 0,
            used_ocr: false,
            used_llm: false,
            used_byu_parser: true,
            confidence_stats: { avg: 1.0, min: 1.0, max: 1.0, low_confidence_count: 0 },
            validation_report: byuResult.validationReport,
            errors: [],
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        return NextResponse.json({ error: 'No courses found in text' }, { status: 422 });
      }
    } catch (error) {
      logError('Text parsing failed', error, { userId: user.id, action: 'transcript_parse_text' });
      return NextResponse.json(
        { error: 'Failed to parse text', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }

  // Handle PDF upload (original logic)
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
    // Use BYU parser by default (can be overridden with query param ?useByuParser=false)
    const url = new URL(request.url);
    const useByuParser = url.searchParams.get('useByuParser') !== 'false'; // Default to true

    const report = await parseTranscriptFromBuffer({
      userId: user.id,
      fileBuffer: buffer,
      fileName,
      useByuParser, // Enable BYU-specific OpenAI parser
      supabaseClient: supabase,
    });

    if (!report.success) {
      return NextResponse.json(
        { success: false, report },
        { status: 422 }
      );
    }

    // Save GPA from transcript (prefer extracted GPA over calculated)
    try {
      let gpa: number | null = null;

      // Use extracted GPA from report if available, otherwise calculate from courses
      if (report.gpa !== null && report.gpa !== undefined) {
        gpa = report.gpa;
        logInfo('Using extracted GPA from transcript', {
          userId: user.id,
          action: 'use_extracted_gpa_pdf_mode',
        });
      } else {
        const savedCourses = await fetchUserCoursesArray(supabase, user.id);
        gpa = calculateGpaFromCourses(savedCourses);
        logInfo('Calculated GPA from courses (no GPA found in transcript)', {
          userId: user.id,
          action: 'calculate_gpa_pdf_mode',
        });
      }

      await updateStudentGpa(supabase, user.id, gpa);
      logInfo('Updated student GPA after PDF transcript parse', {
        userId: user.id,
        action: 'update_gpa_pdf_mode',
      });
    } catch (error) {
      // Log error but don't fail the request
      logError('Failed to update student GPA (PDF mode)', error, {
        userId: user.id,
        action: 'update_gpa_pdf_mode',
      });
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

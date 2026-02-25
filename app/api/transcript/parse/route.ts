import { NextRequest, NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import {
  parseByuTranscriptWithOpenAI,
  parseByuTranscriptPdfWithOpenAI,
  deduplicateByuCourses,
  type ByuTranscriptParseResult,
  type TransferInstitution,
  type ExamCredit,
  type EntranceExam,
} from '@/lib/transcript/byuTranscriptParserOpenAI';
import { logError, logInfo } from '@/lib/logger';
import { calculateGpaFromCourses } from '@/lib/services/gpaCalculationService';
import { updateStudentGpa, updateStudentIdentity } from '@/lib/services/studentService';
import { updateProfileNameIfPlaceholder } from '@/lib/services/profileService.server';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Determines the status of a course based on its grade
 * @param grade - The course grade (can be null, empty string, or a letter grade)
 * @returns Status string: "completed", "withdrawn", or "in-progress"
 */
function deriveStatus(grade: string | null): 'completed' | 'withdrawn' | 'in-progress' {
  if (!grade || grade.trim() === '') {
    return 'in-progress';
  }
  if (grade.toUpperCase() === 'W') {
    return 'withdrawn';
  }
  return 'completed';
}

function parseCourseCode(value: string): { subject: string; number: string; title?: string } | null {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^([A-Z]{1,8}(?:\s+[A-Z]{1,3})?)\s+(\d{3}[A-Z]?)(?:\s+(.+))?$/i);
  if (!match) return null;
  const subject = match[1].trim().toUpperCase();
  const number = match[2].trim().toUpperCase();
  const title = match[3]?.trim();
  return { subject, number, title };
}

function extractNameParts(name: string): { firstName?: string; lastName?: string } {
  if (!name) return {};
  const trimmed = name.trim();
  if (trimmed.includes(',')) {
    const [last, rest] = trimmed.split(',', 2);
    const first = rest?.trim().split(/\s+/)[0];
    return {
      firstName: first || undefined,
      lastName: last?.trim() || undefined,
    };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function buildTransferCourses(institutions: TransferInstitution[]) {
  const courses: Array<{
    id: string;
    subject: string;
    number: string;
    title: string;
    credits: number;
    grade: string | null;
    term: string;
    tags: string[];
    origin: 'transfer';
    status: 'completed' | 'withdrawn' | 'in-progress';
    transfer: {
      institution: string;
      originalSubject: string;
      originalNumber: string;
      originalTitle: string;
      originalCredits: number;
      originalGrade: string;
    };
  }> = [];

  for (const institution of institutions) {
    for (const course of institution.courses ?? []) {
      if (course.accepted === false) {
        continue;
      }

      const originalParsed = parseCourseCode(course.originalCode);
      const equivalentParsed = course.equivalent ? parseCourseCode(course.equivalent) : null;
      const subject = equivalentParsed?.subject ?? originalParsed?.subject ?? 'TRN';
      const number = equivalentParsed?.number ?? originalParsed?.number ?? '000';
      const title = equivalentParsed?.title ?? course.originalTitle ?? 'Transfer Credit';
      const grade = course.grade ?? null;

      courses.push({
        id: randomUUID(),
        subject,
        number,
        title,
        credits: course.hours,
        grade,
        term: 'Transfer Credit',
        tags: [],
        origin: 'transfer',
        status: deriveStatus(grade),
        transfer: {
          institution: institution.name,
          originalSubject: originalParsed?.subject ?? course.originalCode,
          originalNumber: originalParsed?.number ?? '',
          originalTitle: course.originalTitle,
          originalCredits: course.hours,
          originalGrade: course.grade,
        },
      });
    }
  }

  return courses;
}

async function upsertParsedTranscript(options: {
  result: ByuTranscriptParseResult;
  userId: string;
  supabase: SupabaseClient;
  usedOcr: boolean;
}) {
  const { result, userId, supabase, usedOcr } = options;

  const hasAnyTranscriptData =
    result.courses.length > 0 ||
    (result.transferCredits?.length ?? 0) > 0 ||
    (result.examCredits?.length ?? 0) > 0 ||
    (result.entranceExams?.length ?? 0) > 0;

  if (!result.success || !hasAnyTranscriptData) {
    return { report: null };
  }

  const dedupedCourses = deduplicateByuCourses(result.courses);

  const coursesJson = dedupedCourses.map((course) => {
    const grade = course.grade.trim() === '' ? null : course.grade;
    return {
      id: randomUUID(),
      subject: course.subject,
      number: course.number,
      title: course.title,
      credits: course.credits,
      grade,
      term: course.term,
      tags: [],
      origin: course.transfer ? 'transfer' : 'parsed',
      status: deriveStatus(grade),
      ...(course.transfer ? { transfer: course.transfer } : {}),
    };
  });

  const transferCredits = (result.transferCredits ?? []).map((institution) => ({
    ...institution,
    courses: (institution.courses ?? []).map((course) => ({
      id: randomUUID(),
      ...course,
    })),
  }));
  const examCredits: ExamCredit[] = (result.examCredits ?? []).map((exam) => ({
    id: randomUUID(),
    ...exam,
  }));
  const entranceExams: EntranceExam[] = (result.entranceExams ?? []).map((exam) => ({
    id: randomUUID(),
    ...exam,
  }));
  const termMetrics = result.termMetrics ?? [];

  const transferCourses = buildTransferCourses(transferCredits);
  const allCourses = [...coursesJson];
  const seenKeys = new Set(allCourses.map((course) => `${course.term}::${course.subject}::${course.number}`));

  for (const transferCourse of transferCourses) {
    const key = `${transferCourse.term}::${transferCourse.subject}::${transferCourse.number}`;
    if (!seenKeys.has(key)) {
      allCourses.push(transferCourse);
      seenKeys.add(key);
    }
  }

  const { data: existingRecord } = await supabase
    .from('user_courses')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingRecord) {
    await supabase
      .from('user_courses')
      .update({
        courses: allCourses,
        term_metrics: termMetrics,
        transfer_credits: transferCredits,
        exam_credits: examCredits,
        entrance_exams: entranceExams,
      })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_courses')
      .insert({
        user_id: userId,
        courses: allCourses,
        term_metrics: termMetrics,
        transfer_credits: transferCredits,
        exam_credits: examCredits,
        entrance_exams: entranceExams,
      });
  }

  if (result.student) {
    const { student_id, birthdate, name } = result.student;
    try {
      await updateStudentIdentity(supabase, userId, {
        student_identifier: student_id ?? null,
        birthdate: birthdate ?? null,
      });
    } catch (error) {
      logError('Failed to update student identity', error, {
        userId,
        action: usedOcr ? 'update_student_identity_pdf' : 'update_student_identity_text',
      });
    }

    if (name) {
      const { firstName, lastName } = extractNameParts(name);
      try {
        await updateProfileNameIfPlaceholder(userId, firstName, lastName);
      } catch (error) {
        logError('Failed to update profile name from transcript', error, {
          userId,
          action: usedOcr ? 'update_profile_name_pdf' : 'update_profile_name_text',
        });
      }
    }
  }

  try {
    const { error: onboardError } = await supabase
      .from('profiles')
      .update({ onboarded: true })
      .eq('id', userId);

    if (onboardError) {
      throw onboardError;
    }

    logInfo('Marked profile onboarded after transcript parse', {
      userId,
      action: usedOcr ? 'mark_onboarded_pdf' : 'mark_onboarded_text',
    });
  } catch (error) {
    logError('Failed to mark profile onboarded after transcript parse', error, {
      userId,
      action: usedOcr ? 'mark_onboarded_pdf' : 'mark_onboarded_text',
    });
  }

  try {
    let gpa: number | null = null;

    if (result.gpa !== null && result.gpa !== undefined) {
      gpa = result.gpa;
      logInfo('Using extracted GPA from transcript', {
        userId,
        action: usedOcr ? 'use_extracted_gpa_pdf_mode' : 'use_extracted_gpa_text_mode',
      });
    } else {
      gpa = calculateGpaFromCourses(dedupedCourses);
      logInfo('Calculated GPA from courses (no GPA found in transcript)', {
        userId,
        action: usedOcr ? 'calculate_gpa_pdf_mode' : 'calculate_gpa_text_mode',
      });
    }

    await updateStudentGpa(supabase, userId, gpa);
    logInfo('Updated student GPA after transcript parse', {
      userId,
      action: usedOcr ? 'update_gpa_pdf_mode' : 'update_gpa_text_mode',
    });
  } catch (error) {
    logError('Failed to update student GPA after transcript parse', error, {
      userId,
      action: usedOcr ? 'update_gpa_pdf_mode' : 'update_gpa_text_mode',
    });
  }

  const termsDetected = Array.from(new Set(allCourses.map((course) => course.term)));

  return {
    report: {
      success: true,
      courses_found: allCourses.length,
      courses_upserted: allCourses.length,
      terms_detected: termsDetected,
      unknown_lines: 0,
      total_lines: 0,
      used_ocr: usedOcr,
      used_llm: false,
      used_byu_parser: true,
      confidence_stats: { avg: 1.0, min: 1.0, max: 1.0, low_confidence_count: 0 },
      validation_report: result.validationReport,
      errors: [],
      timestamp: new Date().toISOString(),
    },
  };
}

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

      const byuResult = await parseByuTranscriptWithOpenAI(text, user.id);
      const result = await upsertParsedTranscript({
        result: byuResult,
        userId: user.id,
        supabase,
        usedOcr: false,
      });

      if (!result.report) {
        return NextResponse.json({ error: 'No courses found in text' }, { status: 422 });
      }

      return NextResponse.json({ success: true, report: result.report });
    } catch (error) {
      logError('Text parsing failed', error, { userId: user.id, action: 'transcript_parse_text' });
      return NextResponse.json(
        { error: 'Failed to parse text', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  }

  // Handle PDF upload
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
    const byuResult = await parseByuTranscriptPdfWithOpenAI(buffer, fileName, user.id);
    const result = await upsertParsedTranscript({
      result: byuResult,
      userId: user.id,
      supabase,
      usedOcr: true,
    });

    if (!result.report) {
      return NextResponse.json({ error: 'No courses found in transcript' }, { status: 422 });
    }

    return NextResponse.json({ success: true, report: result.report });
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

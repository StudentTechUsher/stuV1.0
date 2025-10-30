import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { uploadPdfToOpenAI, extractCoursesWithOpenAI } from '@/lib/openaiTranscript';
import { logError, logInfo } from '@/lib/logger';
import { extractByuTranscriptText } from '@/lib/transcript/pdfExtractor';
import { parseTranscriptText, type CourseRow } from '@/lib/transcript/byuParser';

// Custom error types for better error handling
export class TranscriptUploadError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'TranscriptUploadError';
  }
}

export class TranscriptParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'TranscriptParseError';
  }
}

export class DocumentNotFoundError extends Error {
  constructor(message = 'Document not found') {
    super(message);
    this.name = 'DocumentNotFoundError';
  }
}

export interface ParseTranscriptResult {
  documentId: string;
  status: 'parsed' | 'failed';
  count?: number;
  error?: string;
}

export interface TranscriptDocument {
  id: string;
  user_id: string;
  type: string;
  storage_path: string;
  status: 'uploaded' | 'parsing' | 'parsed' | 'failed';
  created_at: string;
  updated_at?: string;
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own transcripts only)
 * Parses a BYU transcript using native TypeScript parser with optional OpenAI fallback
 * @param documentId - The document ID to parse
 * @param userId - The user ID who owns the document
 * @param useOpenAIFallback - Whether to use OpenAI if BYU parser fails (default: false)
 * @returns Parse result with course count
 */
export async function parseTranscript(
  documentId: string,
  userId: string,
  useOpenAIFallback = false
): Promise<ParseTranscriptResult> {
  try {
    // Fetch document to get storage path
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError) {
      if (docError.code === 'PGRST116') {
        throw new DocumentNotFoundError(`Document with ID "${documentId}" not found`);
      }
      throw new TranscriptParseError('Failed to fetch document', docError);
    }

    const storagePath = document.storage_path;

    // Update status to 'parsing'
    await supabase
      .from('documents')
      .update({ status: 'parsing' })
      .eq('id', documentId);

    // Create admin client for database operations
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
      throw new TranscriptParseError(`Failed to download PDF: ${downloadError?.message || 'No data'}`);
    }

    const pdfBytes = Buffer.from(await downloadData.arrayBuffer());

    let courses: CourseRow[] = [];
    let _usedByuParser = false;

    // Try BYU native parser first
    try {
      const transcriptText = await extractByuTranscriptText(pdfBytes);
      const parseResult = parseTranscriptText(transcriptText);
      courses = parseResult.courses;
      _usedByuParser = true;

      logInfo('BYU transcript parsing completed', {
        userId,
        action: 'transcript_parse_byu',
        count: courses.length,
      });
    } catch (byuParserError) {
      logError('BYU parser failed', byuParserError, {
        userId,
        action: 'byu_parser_failure',
      });

      // Fall back to OpenAI if enabled
      if (useOpenAIFallback) {
        logInfo('Falling back to OpenAI parser', {
          userId,
          action: 'openai_fallback',
        });

        // Upload PDF to OpenAI
        const fileId = await uploadPdfToOpenAI(pdfBytes, `${documentId}.pdf`);
        // Do NOT log fileId - it creates linkage between user and OpenAI

        // Extract courses using OpenAI
        const openAICourses = await extractCoursesWithOpenAI(fileId);
        logInfo('OpenAI transcript parsing completed', {
          userId,
          action: 'transcript_parse_openai',
          count: openAICourses.length,
        });

        // Convert OpenAI format to BYU format
        courses = openAICourses.map(c => ({
          term: c.term ?? 'Unknown',
          subject: c.subject,
          number: c.number,
          title: c.title ?? '',
          credits: c.credits ?? 0,
          grade: c.grade,
          confidence: 0.8, // Default confidence for OpenAI parsed courses
        }));
      } else {
        // Re-throw error if fallback not enabled
        throw new TranscriptParseError('BYU parser failed and OpenAI fallback is disabled', byuParserError);
      }
    }

    // Delete all existing courses for this user
    // This ensures we don't accumulate stale data from previous transcript uploads
    const { error: deleteError } = await admin
      .from('user_courses')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      logError('Failed to delete previous courses', deleteError, {
        userId,
        action: 'delete_previous_courses',
      });
      throw new TranscriptParseError('Failed to prepare for new course data');
    }

    logInfo('Deleted previous courses', {
      userId,
      action: 'delete_previous_courses',
    });

    // Upsert courses into user_courses table (simplified schema)
    for (const course of courses) {
      const { error: upsertError } = await admin.from('user_courses').upsert(
        {
          user_id: userId,
          term: course.term,
          subject: course.subject,
          number: course.number,
          title: course.title,
          credits: course.credits,
          grade: course.grade,
        },
        { onConflict: 'user_id,subject,number,term' }
      );

      if (upsertError) {
        // CRITICAL: Do NOT log upsertError details - may contain course data
        logError('Course upsert failed', upsertError, {
          userId,
          action: 'course_upsert',
        });
        throw new TranscriptParseError('Failed to save course data');
      }
    }

    // Update document status to 'parsed'
    await admin
      .from('documents')
      .update({ status: 'parsed' })
      .eq('id', documentId);

    return {
      documentId,
      status: 'parsed',
      count: courses.length,
    };
  } catch (error) {
    // Mark document as failed
    await supabase
      .from('documents')
      .update({ status: 'failed' })
      .eq('id', documentId);

    if (error instanceof TranscriptParseError || error instanceof DocumentNotFoundError) {
      throw error;
    }

    throw new TranscriptParseError('Failed to parse transcript', error);
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own transcripts only)
 * Fetches all transcript documents for a user
 * @param userId - The user ID
 * @returns Array of transcript documents
 */
export async function fetchUserTranscripts(userId: string): Promise<TranscriptDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'transcript')
    .order('created_at', { ascending: false });

  if (error) {
    throw new TranscriptParseError('Failed to fetch user transcripts', error);
  }

  return data || [];
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Fetches parsed courses for a user
 * @param userId - The user ID
 * @returns Array of parsed courses
 */
export async function fetchUserCourses(userId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .order('term', { ascending: false });

  if (error) {
    throw new TranscriptParseError('Failed to fetch user courses', error);
  }

  return data || [];
}

export class CourseUpsertError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseUpsertError';
  }
}

export interface CourseInput {
  id?: string; // Optional: if updating existing course
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade?: string | null;
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own courses only)
 * Bulk upserts courses for a user
 * @param userId - The user ID
 * @param courses - Array of courses to upsert
 * @returns Object containing success status and count of courses processed
 */
export async function bulkUpsertCourses(userId: string, courses: CourseInput[]) {
  try {
    if (!courses || courses.length === 0) {
      throw new CourseUpsertError('No courses provided');
    }

    // Validate course data
    for (const course of courses) {
      if (!course.term || !course.subject || !course.number || !course.title) {
        throw new CourseUpsertError('Missing required course fields');
      }

      if (typeof course.credits !== 'number' || course.credits <= 0) {
        throw new CourseUpsertError('Invalid credits value');
      }
    }

    // Prepare records for upsert
    const records = courses.map((course) => ({
      user_id: userId,
      term: course.term,
      subject: course.subject,
      number: course.number,
      title: course.title,
      credits: course.credits,
      grade: course.grade || null,
    }));

    // Bulk upsert courses
    const { data, error: upsertError } = await supabase
      .from('user_courses')
      .upsert(records, {
        onConflict: 'user_id,subject,number,term',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      throw new CourseUpsertError('Failed to save courses', upsertError);
    }

    return {
      success: true,
      coursesProcessed: data?.length || 0,
      courses: data,
    };
  } catch (error) {
    if (error instanceof CourseUpsertError) {
      throw error;
    }
    throw new CourseUpsertError('Unexpected error upserting courses', error);
  }
}

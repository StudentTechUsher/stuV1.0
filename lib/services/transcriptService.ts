import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { uploadPdfToOpenAI, extractCoursesWithOpenAI } from '@/lib/openaiTranscript';
import { logError, logInfo } from '@/lib/logger';

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
 * Parses a transcript using either Python parser or OpenAI fallback
 * @param documentId - The document ID to parse
 * @param userId - The user ID who owns the document
 * @param usePythonParser - Whether to use Python parser (default: true)
 * @returns Parse result with course count
 */
export async function parseTranscript(
  documentId: string,
  userId: string,
  usePythonParser = true
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

    let coursesCount = 0;

    if (usePythonParser) {
      // Use Python FastAPI parser
      const parserUrl = process.env.TRANSCRIPT_PARSER_URL || 'http://localhost:8787';

      try {
        const parseResponse = await fetch(`${parserUrl}/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'transcripts',
            path: storagePath,
            user_id: userId,
          }),
        });

        if (!parseResponse.ok) {
          const errorText = await parseResponse.text();
          throw new TranscriptParseError(`Python parser failed: ${errorText}`);
        }

        const parseReport = await parseResponse.json();
        logInfo('Python parser completed', {
          userId,
          action: 'transcript_parse_python',
          count: parseReport.courses_upserted || 0,
        });

        coursesCount = parseReport.courses_upserted || 0;

        // Update document status to 'parsed'
        await supabase
          .from('documents')
          .update({ status: 'parsed' })
          .eq('id', documentId);

        return {
          documentId,
          status: 'parsed',
          count: coursesCount,
        };
      } catch (pythonError) {
        logError('Python parser failed, falling back to OpenAI', pythonError, {
          userId,
          action: 'python_parser_failure',
        });
        // Fall through to OpenAI parsing
      }
    }

    // Use OpenAI parser (fallback or primary if Python disabled)
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

    // Upload PDF to OpenAI
    const fileId = await uploadPdfToOpenAI(pdfBytes, `${documentId}.pdf`);
    // Do NOT log fileId - it creates linkage between user and OpenAI

    // Extract courses using OpenAI
    const courses = await extractCoursesWithOpenAI(fileId);
    logInfo('Transcript parsing completed', {
      userId,
      action: 'transcript_parse_openai',
      count: courses.length,
    });

    // Upsert courses into user_courses table
    for (const course of courses) {
      const { error: upsertError } = await admin.from('user_courses').upsert(
        {
          user_id: userId,
          term: course.term ?? null,
          subject: course.subject,
          number: course.number,
          title: course.title ?? null,
          credits: course.credits ?? null,
          grade: course.grade ?? null,
          confidence: course.confidence ?? null,
          source_document: documentId,
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

    coursesCount = courses.length;

    return {
      documentId,
      status: 'parsed',
      count: coursesCount,
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
 * Fetches parsed courses for a user from a specific document
 * @param userId - The user ID
 * @param documentId - Optional document ID to filter by
 * @returns Array of parsed courses
 */
export async function fetchUserCourses(userId: string, documentId?: string): Promise<unknown[]> {
  let query = supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .order('term', { ascending: false });

  if (documentId) {
    query = query.eq('source_document', documentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new TranscriptParseError('Failed to fetch user courses', error);
  }

  return data || [];
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseTranscriptText, validateCourse, type CourseRow } from '@/lib/transcript/parser';
import { logError, logInfo } from '@/lib/logger';

export interface TranscriptParseReport {
  success: boolean;
  courses_found: number;
  courses_upserted: number;
  terms_detected: string[];
  unknown_lines: number;
  total_lines: number;
  used_ocr: boolean;
  used_llm: boolean;
  confidence_stats: {
    avg: number;
    min: number;
    max: number;
    low_confidence_count: number;
  };
  errors: string[];
  timestamp: string;
}

export interface ParseTranscriptFromBufferOptions {
  userId: string;
  fileBuffer: Buffer;
  fileName?: string;
  useLlmFallback?: boolean;
  documentId?: string;
  supabaseClient?: SupabaseClient;
}

type LlmCourse = {
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
  confidence?: number;
};

type LlmTerm = {
  term: string;
  courses: LlmCourse[];
};

let cachedAdminClient: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<{ text: string; usedOcr: boolean }> {
  // Use pdfjs-dist which works reliably in Next.js
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(pdfBuffer);

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDocument = await loadingTask.promise;

  const textPages: string[] = [];

  // Extract text from each page
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str?: string }) => item.str || '')
      .join(' ');
    textPages.push(pageText);
  }

  const text = textPages.join('\n');
  const trimmed = text.trim();
  const usedOcr = trimmed.length < 800;

  return { text, usedOcr };
}

function shouldUseLlmFallback(
  courses: CourseRow[],
  metadata: { unknownLines: number; totalLines: number },
  rawText: string,
  explicitOverride?: boolean
): boolean {
  if (explicitOverride === false) {
    return false;
  }

  if (explicitOverride === true) {
    return true;
  }

  if (process.env.USE_LLM_FALLBACK?.toLowerCase() !== 'true') {
    return false;
  }

  if (!process.env.OPENAI_API_KEY) {
    return false;
  }

  if (courses.length === 0) {
    return true;
  }

  const totalLines = Math.max(metadata.totalLines, 1);
  if (metadata.unknownLines / totalLines > 0.25) {
    return true;
  }

  if (rawText.trim().length === 0) {
    return true;
  }

  return false;
}

async function extractCoursesWithLlm(rawText: string): Promise<Array<LlmCourse & { term: string }>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be configured for LLM fallback');
  }

  const model = process.env.OPENAI_TRANSCRIPT_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      terms: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            term: { type: 'string' },
            courses: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  subject: { type: 'string' },
                  number: { type: 'string' },
                  title: { type: 'string' },
                  credits: { type: 'number' },
                  grade: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['subject', 'number', 'title', 'credits'],
              },
            },
          },
          required: ['term', 'courses'],
        },
      },
    },
    required: ['terms'],
  };

  const userPrompt = `Extract all courses from this academic transcript, organized by term/semester.

Return a JSON structure with an array of terms, where each term contains:
- term: full term label (e.g., "Fall Semester 2020", "Summer Term 2018")
- courses: array of courses taken in that term

For each course in the courses array provide:
- subject: subject code verbatim (e.g., "MATH", "REL A")
- number: catalog number (e.g., "112")
- title: course title
- credits: numeric credit hours
- grade: letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F, CR, NC, P, I, W, T) or null if missing

IMPORTANT: Group courses by the term/semester they occurred in. Each course should appear under its corresponding term.

Skip summary lines, headers, and GPA totals. Include transfer/AP rows. Use null grade for current enrollment.

Expected JSON structure:
{
  "terms": [
    {
      "term": "Fall Semester 2020",
      "courses": [
        {"subject": "MATH", "number": "112", "title": "Calculus I", "credits": 3, "grade": "A"},
        {"subject": "ENG", "number": "101", "title": "Writing", "credits": 3, "grade": "B+"}
      ]
    },
    {
      "term": "Winter Semester 2021",
      "courses": [...]
    }
  ]
}

Transcript text:
${rawText}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a precise transcript parser. Group courses by term/semester and return them exactly as they appear without inventing new data.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'course_extraction',
          strict: true,
          schema,
        },
      },
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LLM fallback failed: ${response.status} ${detail}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    return [];
  }

  try {
    const parsed = JSON.parse(content) as { terms?: LlmTerm[] };
    const terms = parsed.terms ?? [];

    // Flatten terms into individual courses with term attached
    const courses: Array<LlmCourse & { term: string }> = [];
    for (const termObj of terms) {
      for (const course of termObj.courses) {
        courses.push({
          term: termObj.term,
          ...course,
          confidence: course.confidence ?? 0.6,
        });
      }
    }

    return courses;
  } catch (error) {
    logError('Failed to parse LLM JSON payload', error, {
      action: 'transcript_llm_fallback_parse',
    });
    return [];
  }
}

function convertLlmCourses(courses: Array<LlmCourse & { term: string }>): CourseRow[] {
  return courses.map((course) => ({
    term: course.term,
    subject: course.subject.toUpperCase(),
    number: course.number.toUpperCase(),
    title: course.title,
    credits: Number(course.credits),
    grade: course.grade ?? null,
    confidence: course.confidence ?? 0.6,
  }));
}

function dedupeCourses(courses: CourseRow[]): CourseRow[] {
  const seen = new Map<string, CourseRow>();
  for (const course of courses) {
    const key = `${course.term}::${course.subject}::${course.number}`;
    if (!seen.has(key)) {
      seen.set(key, course);
    }
  }
  return Array.from(seen.values());
}

async function upsertCourses(
  userId: string,
  courses: CourseRow[],
  documentId: string | null | undefined,
  supabaseClient?: SupabaseClient
) {
  if (!courses.length) {
    return 0;
  }

  const client = supabaseClient ?? getSupabaseAdmin();

  // Delete all existing courses for this user
  // This ensures we don't accumulate stale data from previous transcript uploads
  const { error: deleteError } = await client
    .from('user_courses')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    logError('Failed to delete previous courses', deleteError, {
      userId,
      action: 'delete_previous_courses',
    });
    throw new Error('Failed to prepare for new course data');
  }

  logInfo('Deleted previous courses', {
    userId,
    action: 'delete_previous_courses',
  });

  const payload = courses.map((course) => ({
    user_id: userId,
    term: course.term,
    subject: course.subject,
    number: course.number,
    title: course.title,
    credits: course.credits,
    grade: course.grade,
  }));

  const { data, error } = await client
    .from('user_courses')
    .upsert(payload, { onConflict: 'user_id,subject,number,term' })
    .select('id');

  if (error) {
    throw new Error(`Failed to upsert courses: ${error.message}`);
  }

  return data?.length ?? 0;
}

function computeConfidenceStats(courses: CourseRow[]) {
  if (!courses.length) {
    return {
      avg: 0,
      min: 0,
      max: 0,
      low_confidence_count: 0,
    };
  }

  const confidences = courses.map((course) => course.confidence);
  const sum = confidences.reduce((acc, value) => acc + value, 0);

  return {
    avg: sum / confidences.length,
    min: Math.min(...confidences),
    max: Math.max(...confidences),
    low_confidence_count: confidences.filter((value) => value < 0.7).length,
  };
}

export async function parseTranscriptFromBuffer(
  options: ParseTranscriptFromBufferOptions
): Promise<TranscriptParseReport> {
  const { userId, fileBuffer, useLlmFallback, documentId } = options;
  const supabaseClient = options.supabaseClient;
  const errors: string[] = [];
  let usedLlm = false;

  const { text, usedOcr } = await extractTextFromPdf(fileBuffer);
  const { courses: parsedCourses, metadata } = parseTranscriptText(text);

  let workingCourses = parsedCourses;

  if (shouldUseLlmFallback(parsedCourses, metadata, text, useLlmFallback)) {
    try {
      const llmCourses = await extractCoursesWithLlm(text);
      if (llmCourses.length) {
        workingCourses = convertLlmCourses(llmCourses);
        usedLlm = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`LLM fallback failed: ${message}`);
      logError('Transcript LLM fallback error', error, {
        userId,
        action: 'transcript_llm_fallback',
      });
    }
  }

  const validCourses = workingCourses.filter((course) => {
    const isValid = validateCourse(course);
    if (!isValid) {
      errors.push(`Invalid course data: ${course.subject} ${course.number}`);
    }
    return isValid;
  });

  const dedupedCourses = dedupeCourses(validCourses);

  let coursesUpserted = 0;
  try {
    coursesUpserted = await upsertCourses(userId, dedupedCourses, documentId ?? null, supabaseClient);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    logError('Transcript course upsert failed', error, {
      userId,
      action: 'transcript_course_upsert',
    });
  }

  logInfo('Transcript parsed', {
    userId,
    action: 'transcript_parse',
    status: usedLlm ? 'llm_fallback' : 'primary_parser',
    count: dedupedCourses.length,
  });

  const confidenceStats = computeConfidenceStats(dedupedCourses);
  const timestamp = new Date().toISOString();

  return {
    success: errors.length === 0,
    courses_found: dedupedCourses.length,
    courses_upserted: coursesUpserted,
    terms_detected: metadata.termsFound,
    unknown_lines: metadata.unknownLines,
    total_lines: metadata.totalLines,
    used_ocr: usedOcr,
    used_llm: usedLlm,
    confidence_stats: confidenceStats,
    errors,
    timestamp,
  };
}

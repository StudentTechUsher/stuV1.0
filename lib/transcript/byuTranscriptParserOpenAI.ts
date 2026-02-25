import { z } from 'zod';
import { logError, logInfo } from '@/lib/logger';
import { captureServerEvent } from '@/lib/observability/posthog-server';

// ============================================================================
// BYU-SPECIFIC TRANSCRIPT PARSER WITH OPENAI
// ============================================================================
// This parser is designed specifically for BYU transcript PDFs.
// It sends the PDF directly to OpenAI's API as base64 (no storage upload needed)
// and validates the output against BYU-specific course patterns.
// ============================================================================

/**
 * Zod schema for validating BYU course data
 *
 * BYU Course Code Pattern:
 * - Subject: Uppercase letters with optional internal spaces, max 8 characters total
 *   Examples: CS, MATH, BIO, REL A, A HTG, C S, EC EN, ME EN, PHSCS, STDEV, GSCM
 * - Number: 3 digits optionally followed by a letter (e.g., 142, 112R, 275)
 * - Credits: Positive number, max 20
 * - Grade: Standard letter grades (A, A-, B+, etc.), P/F, I/W, or null/empty for concurrent
 * - Term: Must be present (e.g., "Fall Semester 2023")
 */
export interface TransferCreditInfo {
  institution: string;
  originalSubject: string;
  originalNumber: string;
  originalTitle: string;
  originalCredits: number;
  originalGrade: string;
}

export interface TranscriptStudentInfo {
  name: string | null;
  student_id: string | null;
  birthdate: string | null;
}

export interface TransferCourse {
  id?: string;
  originalCode: string;
  originalTitle: string;
  hours: number;
  grade: string;
  accepted: boolean | null;
  equivalent: string | null;
}

export interface TransferInstitution {
  name: string;
  location: string | null;
  fromYear: number | null;
  toYear: number | null;
  courses: TransferCourse[];
}

export interface ExamCredit {
  id?: string;
  type: 'AP' | 'IB' | 'CLEP';
  subject: string;
  score: number | string;
  equivalent: string;
  hours: number;
  grade: string;
  year: number | null;
}

export interface EntranceExam {
  id?: string;
  name: 'ACT' | 'SAT' | 'SAT1' | 'SAT2';
  scoreType: string | null;
  score: number;
  date: string | null;
}

export interface TermMetrics {
  term: string;
  hoursEarned: number | null;
  hoursGraded: number | null;
  termGpa: number | null;
}

export const ByuCourseSchema = z.object({
  subject: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z\s]{1,8}$/,
      'Subject must be uppercase letters and spaces, max 8 characters (e.g., CS, MATH, REL A, A HTG, EC EN)'
    )
    .refine(
      (val) => val.replace(/\s/g, '').length >= 1,
      'Subject must contain at least one letter'
    )
    .describe('Course subject code'),

  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^\d{3}[A-Z]?$/,
      'Number must be 3 digits optionally followed by a letter (e.g., 142, 112R)'
    )
    .describe('Course number'),

  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .describe('Course title'),

  credits: z
    .number()
    .positive('Credits must be positive')
    .max(20, 'Credits cannot exceed 20')
    .describe('Course credits'),

  grade: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^$|^[A-DF][+-]?$|^P$|^F$|^I$|^W$|^CR$|^NC$|^T$/,
      'Invalid grade format. Expected: A, A-, B+, C, D, F, P, I, W, CR, NC, T, or empty for concurrent courses'
    )
    .describe('Letter grade or special status (empty string if no grade)'),

  term: z
    .string()
    .trim()
    .min(1, 'Term is required')
    .describe('Academic term (e.g., Fall Semester 2023)'),

  transfer: z.optional(z.object({
    institution: z.string().describe('Transfer institution name'),
    originalSubject: z.string().describe('Original course subject code'),
    originalNumber: z.string().describe('Original course number'),
    originalTitle: z.string().describe('Original course title'),
    originalCredits: z.number().describe('Original course credits'),
    originalGrade: z.string().describe('Original course grade'),
  })).describe('Transfer credit information (only present for transfer credits)'),
});

/**
 * Schema for the full OpenAI response structure
 */
const ByuTranscriptResponseSchema = z.object({
  gpa: z.number().nullable().describe('Overall undergraduate GPA from transcript, or null if not found'),
  student: z.object({
    name: z.string().nullable(),
    student_id: z.string().nullable(),
    birthdate: z.string().nullable(),
  }).describe('Student identity fields from transcript'),
  transfer_credits: z.array(z.object({
    name: z.string().describe('Transfer institution name'),
    location: z.string().nullable(),
    fromYear: z.number().nullable(),
    toYear: z.number().nullable(),
    courses: z.array(z.object({
      originalCode: z.string(),
      originalTitle: z.string(),
      hours: z.number(),
      grade: z.string(),
      accepted: z.boolean().nullable(),
      equivalent: z.string().nullable(),
    })),
  })).describe('Transfer credit institutions and courses'),
  exam_credits: z.array(z.object({
    type: z.enum(['AP', 'IB', 'CLEP']),
    subject: z.string(),
    score: z.union([z.number(), z.string()]),
    equivalent: z.string(),
    hours: z.number(),
    grade: z.string(),
    year: z.number().nullable(),
  })).describe('AP/IB/CLEP credits'),
  entrance_exams: z.array(z.object({
    name: z.enum(['ACT', 'SAT', 'SAT1', 'SAT2']),
    scoreType: z.string().nullable(),
    score: z.number(),
    date: z.string().nullable(),
  })).describe('Entrance exam scores'),
  terms: z.array(
    z.object({
      term: z.string().describe('Term/semester label'),
      hoursEarned: z.number().nullable().describe('Semester hours earned'),
      hoursGraded: z.number().nullable().describe('Semester hours graded'),
      termGpa: z.number().nullable().describe('Semester GPA'),
      courses: z.array(
        z.object({
          subject: z.string(),
          number: z.string(),
          title: z.string(),
          credits: z.number(),
          grade: z.string(), // Required field, but can be empty string
        })
      ),
    }).describe('Term data including metrics and courses')
  ),
});

const BYU_TRANSCRIPT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    gpa: {
      type: ['number', 'null'],
      description: 'Overall undergraduate GPA from transcript (e.g., 3.75), or null if not found',
    },
    student: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: ['string', 'null'] },
        student_id: { type: ['string', 'null'] },
        birthdate: { type: ['string', 'null'] },
      },
      required: ['name', 'student_id', 'birthdate'],
    },
    transfer_credits: {
      type: 'array',
      description: 'Transfer credits grouped by institution',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          location: { type: ['string', 'null'] },
          fromYear: { type: ['number', 'null'] },
          toYear: { type: ['number', 'null'] },
          courses: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                originalCode: { type: 'string' },
                originalTitle: { type: 'string' },
                hours: { type: 'number' },
                grade: { type: 'string' },
                accepted: { type: ['boolean', 'null'] },
                equivalent: { type: ['string', 'null'] },
              },
              required: ['originalCode', 'originalTitle', 'hours', 'grade', 'accepted', 'equivalent'],
            },
          },
        },
        required: ['name', 'location', 'fromYear', 'toYear', 'courses'],
      },
    },
    exam_credits: {
      type: 'array',
      description: 'AP/IB/CLEP exam credits',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['AP', 'IB', 'CLEP'] },
          subject: { type: 'string' },
          score: { type: ['number', 'string'] },
          equivalent: { type: 'string' },
          hours: { type: 'number' },
          grade: { type: 'string' },
          year: { type: ['number', 'null'] },
        },
        required: ['type', 'subject', 'score', 'equivalent', 'hours', 'grade', 'year'],
      },
    },
    entrance_exams: {
      type: 'array',
      description: 'ACT/SAT scores',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', enum: ['ACT', 'SAT', 'SAT1', 'SAT2'] },
          scoreType: { type: ['string', 'null'] },
          score: { type: 'number' },
          date: { type: ['string', 'null'] },
        },
        required: ['name', 'scoreType', 'score', 'date'],
      },
    },
    terms: {
      type: 'array',
      description: 'Array of academic terms/semesters',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          term: {
            type: 'string',
            description: 'Term label (e.g., Fall Semester 2023)',
          },
          hoursEarned: {
            type: ['number', 'null'],
            description: 'Semester hours earned (SEM HR ERN)',
          },
          hoursGraded: {
            type: ['number', 'null'],
            description: 'Semester hours graded (HR GRD)',
          },
          termGpa: {
            type: ['number', 'null'],
            description: 'Semester GPA',
          },
          courses: {
            type: 'array',
            description: 'Courses taken in this term',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                subject: {
                  type: 'string',
                  description:
                    'Course subject code, uppercase letters with optional spaces, max 8 characters (e.g., CS, MATH, REL A, A HTG, C S, EC EN)',
                },
                number: {
                  type: 'string',
                  description:
                    'Course number, 3 digits optionally followed by letter (e.g., 142, 112R)',
                },
                title: {
                  type: 'string',
                  description: 'Course title',
                },
                credits: {
                  type: 'number',
                  description: 'Course credit hours (decimal number)',
                },
                grade: {
                  type: 'string',
                  description:
                    'Letter grade (A, A-, B+, etc.) or empty string for concurrent/in-progress courses without grades',
                },
              },
              required: ['subject', 'number', 'title', 'credits', 'grade'],
            },
          },
        },
        required: ['term', 'hoursEarned', 'hoursGraded', 'termGpa', 'courses'],
      },
    },
  },
  required: ['gpa', 'student', 'transfer_credits', 'exam_credits', 'entrance_exams', 'terms'],
} as const;

const BYU_TRANSCRIPT_PROMPT = `Extract ALL courses and the required student/semester metadata from this BYU academic transcript.

**IMPORTANT INSTRUCTIONS:**

0. **Required fields:**
   - Every field in the JSON schema is required.
   - If a value is missing, use null (do not omit keys).

1. **GPA Extraction:**
   - Look for the overall undergraduate GPA on the transcript (often labeled as "Undergraduate GPA", "Cumulative GPA", or "Overall GPA")
   - Extract the numerical value (e.g., 3.75, 3.50, 2.80)
   - If no GPA is found on the transcript, return null for the gpa field

2. **Course Code Pattern:** BYU course codes follow this pattern:
   - Subject: Uppercase letters with optional internal spaces, max 8 characters total (e.g., "CS", "MATH", "REL A", "A HTG", "C S", "EC EN", "ME EN")
   - Number: 3 digits, optionally followed by a letter (e.g., "142", "112R", "275")

3. **Credits:** Extract the decimal credit value for each course (e.g., 3.0, 4.0, 1.5)

4. **Grades:**
   - Extract letter grades as they appear: A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
   - Special grades: P (Pass), I (Incomplete), W (Withdrawn), CR (Credit), NC (No Credit), T (Transfer)
   - For concurrent enrollment or in-progress courses with no grade yet, use empty string

5. **Terms:** Group courses by the term/semester they were taken (e.g., "Fall Semester 2023", "Winter Semester 2024")
   - Also extract the per-term metrics printed on the transcript:
     - SEM HR ERN (hours earned)
     - HR GRD (hours graded)
     - GPA (term GPA)
   - If any term metric is missing, return null for that value.

6. **Student Information:**
   - Extract student name, student ID, and birthdate from the STUDENT INFORMATION section.
   - Use null when not found.

7. **Transfer Credits:**
   - If a Transfer Credits section exists, extract each institution and its attended years.
   - If course rows are listed, extract each course with original code/title, hours, grade, acceptance, and equivalency when present.

8. **Exam Credits (AP/IB/CLEP):**
   - Extract any AP/IB/CLEP credits listed, including subject, score, equivalent course, hours, grade, and year if present.

9. **Entrance Exams:**
   - Extract ACT/SAT/SAT2 exam scores if listed (name, score type, score, date).

10. **What to include:**
   - All regular courses
   - Transfer credits (if shown)
   - AP/IB credits (if shown)
   - Concurrent enrollment courses

11. **What to skip from course extraction:**
   - GPA summary lines (extract GPA separately in the gpa field)
   - Total credit lines
   - Header/footer information
   - Administrative notes

Return the data in JSON format with:
- student: { name, student_id, birthdate }
- gpa: the overall undergraduate GPA (number) or null if not found
- transfer_credits: array of institutions with courses (empty array if none)
- exam_credits: array of AP/IB/CLEP credits (empty array if none)
- entrance_exams: array of ACT/SAT scores (empty array if none)
- terms: array of terms, where each term contains metrics and an array of courses

Extract every course you can find. Be thorough and precise.`;

export type ByuCourse = z.infer<typeof ByuCourseSchema>;
export type ByuTranscriptResponse = z.infer<typeof ByuTranscriptResponseSchema>;

/**
 * Validation error details for a single course
 */
export interface CourseValidationError {
  course: {
    subject: string;
    number: string;
    title: string;
  };
  errors: string[];
}

/**
 * Complete validation report
 */
export interface ByuTranscriptValidationReport {
  totalParsed: number;
  validCourses: number;
  invalidCourses: number;
  validationErrors: CourseValidationError[];
}

/**
 * Result of BYU transcript parsing
 */
export interface ByuTranscriptParseResult {
  success: boolean;
  courses: Array<ByuCourse>;
  gpa?: number | null;
  student?: TranscriptStudentInfo | null;
  termMetrics?: TermMetrics[];
  transferCredits?: TransferInstitution[];
  examCredits?: ExamCredit[];
  entranceExams?: EntranceExam[];
  validationReport: ByuTranscriptValidationReport;
  rawResponse?: unknown;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Custom error classes
 */
export class ByuTranscriptParseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ByuTranscriptParseError';
  }
}

export class ByuTranscriptValidationError extends Error {
  constructor(
    message: string,
    public validationReport: ByuTranscriptValidationReport
  ) {
    super(message);
    this.name = 'ByuTranscriptValidationError';
  }
}

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  content?: OpenAIResponseContent[];
};

function extractResponseOutputText(result: unknown): string {
  if (!result || typeof result !== 'object') {
    return '';
  }

  const outputText = (result as { output_text?: unknown }).output_text;
  if (typeof outputText === 'string' && outputText.trim().length > 0) {
    return outputText;
  }

  const output = (result as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return '';
  }

  const chunks: string[] = [];
  for (const item of output as OpenAIResponseOutput[]) {
    if (!item?.content || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part.text === 'string') {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join('');
}

function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function extractOpenAiErrorDetails(errorText: string): {
  type?: string;
  code?: string;
  param?: string;
} {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { type?: string; code?: string; param?: string };
    };
    return {
      type: parsed.error?.type,
      code: parsed.error?.code,
      param: parsed.error?.param,
    };
  } catch {
    return {};
  }
}

function captureTranscriptOpenAiError(options: {
  userId: string;
  action: string;
  httpStatus: number;
  model: string;
  errorDetails?: { type?: string; code?: string; param?: string };
  requestId?: string | null;
}) {
  const { userId, action, httpStatus, model, errorDetails, requestId } = options;
  const userIdHash = hashUserId(userId);

  void captureServerEvent(
    'transcript_openai_error',
    {
      action,
      http_status: httpStatus,
      error_type: errorDetails?.type,
      error_code: errorDetails?.code,
      error_hint: errorDetails?.param,
      openai_request_id: requestId ?? undefined,
      model,
      user_id_hash: userIdHash,
      success: false,
    },
    userIdHash
  );
}

function parseByuTranscriptJson(content: string, userId: string): ByuTranscriptResponse {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(content.trim());
  } catch (error) {
    logError('Failed to parse OpenAI JSON response', error, {
      userId,
      action: 'byu_transcript_json_parse',
    });

    throw new ByuTranscriptParseError(
      'Failed to parse OpenAI response as JSON',
      error
    );
  }

  const validationResult = ByuTranscriptResponseSchema.safeParse(rawJson);

  if (!validationResult.success) {
    logError('Invalid response structure from OpenAI', validationResult.error, {
      userId,
      action: 'byu_transcript_response_validation',
    });

    throw new ByuTranscriptParseError(
      `OpenAI returned invalid response structure: ${validationResult.error.issues[0]?.message || 'Unknown error'}`
    );
  }

  return validationResult.data;
}

async function uploadPdfForResponses(
  pdfBuffer: Buffer,
  fileName: string,
  apiKey: string,
  userId: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
  formData.append('file', blob, fileName || 'transcript.pdf');
  formData.append('purpose', 'user_data');

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logError('OpenAI file upload failed for transcript', new Error(errorText), {
      userId,
      action: 'byu_transcript_pdf_upload_failed',
      httpStatus: response.status,
    });
    throw new ByuTranscriptParseError(
      `OpenAI file upload failed: ${response.status} - ${errorText}`
    );
  }

  const result = await response.json();
  const fileId = (result as { id?: string }).id;

  if (!fileId) {
    throw new ByuTranscriptParseError('OpenAI file upload did not return a file id');
  }

  return fileId;
}

async function deleteOpenAiFile(fileId: string, apiKey: string, userId: string) {
  await fetch(`https://api.openai.com/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  }).catch((error) =>
    logError('Failed to delete OpenAI file', error, {
      userId,
      action: 'byu_transcript_pdf_delete_failed',
    })
  );
}

function shouldRetryWithFileId(errorText: string): boolean {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string; param?: string; code?: string };
    };
    const param = parsed.error?.param ?? '';
    const message = parsed.error?.message ?? '';
    const code = parsed.error?.code ?? '';
    if (param.includes('file_data')) return true;
    if (message.includes('file_data')) return true;
    if (code === 'invalid_value' && (param || message)) return true;
  } catch {
    // ignore JSON parse errors
  }

  return errorText.includes('file_data');
}

/**
 * Validates a single course against BYU patterns
 * @param course - Raw course data from OpenAI
 * @returns Validation result with parsed data or errors
 */
function validateByuCourse(course: {
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade?: string | null;
  term: string;
}): { success: true; data: ByuCourse } | { success: false; errors: string[] } {
  const result = ByuCourseSchema.safeParse(course);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Extract error messages from Zod
  const errors = result.error.issues.map((err) => {
    const field = err.path.join('.');
    return `${field}: ${err.message}`;
  });

  return { success: false, errors };
}

/**
 * Validates all courses and generates a validation report
 * @param rawCourses - Raw courses with term information
 * @returns Valid courses and validation report
 */
function validateByuCourses(
  rawCourses: Array<{ term: string } & Omit<ByuCourse, 'term'>>
): {
  validCourses: ByuCourse[];
  validationReport: ByuTranscriptValidationReport;
} {
  const validCourses: ByuCourse[] = [];
  const validationErrors: CourseValidationError[] = [];

  for (const rawCourse of rawCourses) {
    const validation = validateByuCourse(rawCourse);

    if (validation.success) {
      validCourses.push(validation.data);
    } else {
      validationErrors.push({
        course: {
          subject: rawCourse.subject,
          number: rawCourse.number,
          title: rawCourse.title,
        },
        errors: validation.errors,
      });
    }
  }

  const validationReport: ByuTranscriptValidationReport = {
    totalParsed: rawCourses.length,
    validCourses: validCourses.length,
    invalidCourses: validationErrors.length,
    validationErrors,
  };

  return { validCourses, validationReport };
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own transcripts only)
 *
 * Parses a BYU transcript text using OpenAI's Chat Completions API.
 * Accepts raw text extracted from PDF for more reliable parsing.
 *
 * @param transcriptText - Raw text extracted from transcript PDF
 * @param userId - User ID for logging (FERPA compliant - no PII logged)
 * @returns Parse result with validated courses and validation report
 */
export async function parseByuTranscriptWithOpenAI(
  transcriptText: string,
  userId: string
): Promise<ByuTranscriptParseResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ByuTranscriptParseError(
      'OPENAI_API_KEY is not configured. Cannot parse BYU transcript.'
    );
  }

  // Use GPT-4o or 4o-mini (both have vision capabilities)
  const model =
    process.env.OPENAI_BYU_TRANSCRIPT_MODEL ??
    process.env.OPENAI_TRANSCRIPT_MODEL ??
    process.env.OPENAI_MODEL ??
    'gpt-4o-mini';

  try {
    logInfo('Starting BYU transcript parse with OpenAI (text-based)', {
      userId,
      action: 'byu_transcript_parse_start',
      model,
      textLength: transcriptText.length,
    });

    // Make the API request with text instead of file
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
              'You are a precise academic transcript parser specialized in BYU transcripts. Extract course data exactly as it appears, following the specified patterns. Do not invent or modify data.',
          },
          {
            role: 'user',
            content: BYU_TRANSCRIPT_PROMPT + '\n\nTranscript text:\n' + transcriptText,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'byu_transcript_extraction',
            strict: true,
            schema: BYU_TRANSCRIPT_JSON_SCHEMA,
          },
        },
        temperature: 0, // Deterministic output
      }),
    });

    if (!response.ok) {
      const requestId =
        response.headers.get('x-request-id') ?? response.headers.get('openai-request-id');
      const errorText = await response.text();
      const errorDetails = extractOpenAiErrorDetails(errorText);

      // Log the full error response for debugging
      console.error('OpenAI API Error Response:', errorText);

      logError('OpenAI API request failed for BYU transcript', new Error(errorText), {
        userId,
        action: 'byu_transcript_openai_request',
        httpStatus: response.status,
        model,
        errorHint: errorDetails?.param,
      });
      captureTranscriptOpenAiError({
        userId,
        action: 'byu_transcript_openai_request',
        httpStatus: response.status,
        model,
        errorDetails,
        requestId,
      });

      throw new ByuTranscriptParseError(
        `OpenAI API request failed: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (result as any).choices?.[0]?.message?.content;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = (result as any).usage;

    if (!content) {
      throw new ByuTranscriptParseError('No content returned from OpenAI API');
    }

    const parsedResponse = parseByuTranscriptJson(content, userId);

    // Validate that we have terms with courses
    if (!parsedResponse || !parsedResponse.terms || !Array.isArray(parsedResponse.terms)) {
      console.error('Invalid parsedResponse:', parsedResponse);
      throw new ByuTranscriptParseError('No terms found in parsed response');
    }

    // Flatten terms into individual courses with term attached
    const rawCourses: Array<{ term: string } & Omit<ByuCourse, 'term'>> = [];
    for (const termObj of parsedResponse.terms) {
      if (!termObj.courses || !Array.isArray(termObj.courses)) {
        continue; // Skip terms without courses
      }
      for (const course of termObj.courses) {
        rawCourses.push({
          term: termObj.term,
          subject: course.subject,
          number: course.number,
          title: course.title,
          credits: course.credits,
          grade: course.grade, // Now a string (empty if no grade)
        });
      }
    }

    // Validate courses against BYU patterns
    const { validCourses, validationReport } = validateByuCourses(rawCourses);

    logInfo('BYU transcript parsing completed', {
      userId,
      action: 'byu_transcript_parse_complete',
      count: validationReport.totalParsed,
    });

    // Log validation errors if any
    if (validationReport.invalidCourses > 0) {
      logInfo('BYU transcript validation errors detected', {
        userId,
        action: 'byu_transcript_validation_errors',
        count: validationReport.invalidCourses,
      });
    }

    return {
      success: true,
      courses: validCourses,
      gpa: parsedResponse.gpa ?? null,
      student: parsedResponse.student ?? null,
      termMetrics: parsedResponse.terms.map((termObj) => ({
        term: termObj.term,
        hoursEarned: termObj.hoursEarned ?? null,
        hoursGraded: termObj.hoursGraded ?? null,
        termGpa: termObj.termGpa ?? null,
      })),
      transferCredits: parsedResponse.transfer_credits ?? [],
      examCredits: parsedResponse.exam_credits ?? [],
      entranceExams: parsedResponse.entrance_exams ?? [],
      validationReport,
      rawResponse: parsedResponse,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens ?? 0,
            completionTokens: usage.completion_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof ByuTranscriptParseError) {
      throw error;
    }

    logError('Unexpected error during BYU transcript parsing', error, {
      userId,
      action: 'byu_transcript_parse_error',
    });

    throw new ByuTranscriptParseError(
      'Unexpected error during BYU transcript parsing',
      error
    );
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (own transcripts only)
 *
 * Parses a BYU transcript PDF using OpenAI's Responses API with file input.
 * Returns structured JSON directly (single call for OCR + parsing).
 */
export async function parseByuTranscriptPdfWithOpenAI(
  pdfBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<ByuTranscriptParseResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ByuTranscriptParseError(
      'OPENAI_API_KEY is not configured. Cannot parse BYU transcript.'
    );
  }

  const model =
    process.env.OPENAI_BYU_TRANSCRIPT_PDF_MODEL ??
    process.env.OPENAI_TRANSCRIPT_PDF_MODEL ??
    'gpt-5';

  try {
    logInfo('Starting BYU transcript parse with OpenAI (pdf)', {
      userId,
      action: 'byu_transcript_parse_pdf_start',
      model,
      byteCount: pdfBuffer.length,
    });

    const basePayload: {
      model: string;
      input: Array<{
        role: string;
        content: Array<
          | { type: 'input_text'; text: string }
          | { type: 'input_file'; filename?: string; file_data?: string; file_id?: string }
        >;
      }>;
      text: {
        format: {
          type: 'json_schema';
          name: string;
          strict: boolean;
          schema: typeof BYU_TRANSCRIPT_JSON_SCHEMA;
        };
      };
      temperature?: number;
    } = {
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: BYU_TRANSCRIPT_PROMPT,
            },
            {
              type: 'input_file',
              filename: fileName || 'transcript.pdf',
              file_data: pdfBuffer.toString('base64'),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'byu_transcript_extraction',
          strict: true,
          schema: BYU_TRANSCRIPT_JSON_SCHEMA,
        },
      },
    };
    if (!model.startsWith('gpt-5')) {
      basePayload.temperature = 0;
    }

    let response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(basePayload),
    });

    let uploadedFileId: string | null = null;
    if (!response.ok) {
      const requestId =
        response.headers.get('x-request-id') ?? response.headers.get('openai-request-id');
      const errorText = await response.text();
      const errorDetails = extractOpenAiErrorDetails(errorText);
      if (shouldRetryWithFileId(errorText)) {
        logInfo('OpenAI rejected inline file_data, retrying with file_id', {
          userId,
          action: 'byu_transcript_openai_pdf_retry_file_id',
        });

        uploadedFileId = await uploadPdfForResponses(pdfBuffer, fileName, apiKey, userId);
        const payloadWithFileId = {
          ...basePayload,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: BYU_TRANSCRIPT_PROMPT,
                },
                {
                  type: 'input_file',
                  file_id: uploadedFileId,
                },
              ],
            },
          ],
        };

        response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payloadWithFileId),
        });
      } else {
        logError('OpenAI API request failed for BYU transcript (pdf)', new Error(errorText), {
          userId,
          action: 'byu_transcript_openai_pdf_request',
          httpStatus: response.status,
          model,
          errorHint: errorDetails?.param,
        });
        captureTranscriptOpenAiError({
          userId,
          action: 'byu_transcript_openai_pdf_request',
          httpStatus: response.status,
          model,
          errorDetails,
          requestId,
        });

        throw new ByuTranscriptParseError(
          `OpenAI API request failed: ${response.status} - ${errorText}`
        );
      }
    }

    if (!response.ok) {
      const requestId =
        response.headers.get('x-request-id') ?? response.headers.get('openai-request-id');
      const errorText = await response.text();
      const errorDetails = extractOpenAiErrorDetails(errorText);
      logError('OpenAI API request failed for BYU transcript (pdf)', new Error(errorText), {
        userId,
        action: 'byu_transcript_openai_pdf_request',
        httpStatus: response.status,
        model,
        errorHint: errorDetails?.param,
      });
      captureTranscriptOpenAiError({
        userId,
        action: 'byu_transcript_openai_pdf_request',
        httpStatus: response.status,
        model,
        errorDetails,
        requestId,
      });

      if (uploadedFileId) {
        await deleteOpenAiFile(uploadedFileId, apiKey, userId);
      }

      throw new ByuTranscriptParseError(
        `OpenAI API request failed: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    if (uploadedFileId) {
      await deleteOpenAiFile(uploadedFileId, apiKey, userId);
    }
    const content = extractResponseOutputText(result);
    const usage = (result as { usage?: Record<string, number> }).usage;

    if (!content) {
      throw new ByuTranscriptParseError('No content returned from OpenAI API');
    }

    const parsedResponse = parseByuTranscriptJson(content, userId);

    if (!parsedResponse || !parsedResponse.terms || !Array.isArray(parsedResponse.terms)) {
      throw new ByuTranscriptParseError('No terms found in parsed response');
    }

    const rawCourses: Array<{ term: string } & Omit<ByuCourse, 'term'>> = [];
    for (const termObj of parsedResponse.terms) {
      if (!termObj.courses || !Array.isArray(termObj.courses)) {
        continue;
      }
      for (const course of termObj.courses) {
        rawCourses.push({
          term: termObj.term,
          subject: course.subject,
          number: course.number,
          title: course.title,
          credits: course.credits,
          grade: course.grade,
        });
      }
    }

    const { validCourses, validationReport } = validateByuCourses(rawCourses);

    logInfo('BYU transcript parsing completed (pdf)', {
      userId,
      action: 'byu_transcript_parse_pdf_complete',
      count: validationReport.totalParsed,
    });

    if (validationReport.invalidCourses > 0) {
      logInfo('BYU transcript validation errors detected (pdf)', {
        userId,
        action: 'byu_transcript_validation_errors_pdf',
        count: validationReport.invalidCourses,
      });
    }

    const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

    return {
      success: true,
      courses: validCourses,
      gpa: parsedResponse.gpa ?? null,
      student: parsedResponse.student ?? null,
      termMetrics: parsedResponse.terms.map((termObj) => ({
        term: termObj.term,
        hoursEarned: termObj.hoursEarned ?? null,
        hoursGraded: termObj.hoursGraded ?? null,
        termGpa: termObj.termGpa ?? null,
      })),
      transferCredits: parsedResponse.transfer_credits ?? [],
      examCredits: parsedResponse.exam_credits ?? [],
      entranceExams: parsedResponse.entrance_exams ?? [],
      validationReport,
      rawResponse: parsedResponse,
      usage: usage
        ? {
            promptTokens,
            completionTokens,
            totalTokens,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof ByuTranscriptParseError) {
      throw error;
    }

    logError('Unexpected error during BYU transcript parsing (pdf)', error, {
      userId,
      action: 'byu_transcript_parse_pdf_error',
    });

    throw new ByuTranscriptParseError(
      'Unexpected error during BYU transcript parsing',
      error
    );
  }
}

/**
 * Helper function to deduplicate courses by term + subject + number
 * @param courses - Array of courses
 * @returns Deduplicated array
 */
export function deduplicateByuCourses(courses: ByuCourse[]): ByuCourse[] {
  const seen = new Map<string, ByuCourse>();

  for (const course of courses) {
    const key = `${course.term}::${course.subject}::${course.number}`;
    if (!seen.has(key)) {
      seen.set(key, course);
    }
  }

  return Array.from(seen.values());
}

/**
 * Converts BYU courses to the user_courses table format
 * @param courses - Validated BYU courses
 * @param userId - User ID
 * @returns Array of records ready for database insertion
 */
export function convertByuCoursesToDbFormat(
  courses: ByuCourse[],
  userId: string
): Array<{
  user_id: string;
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
}> {
  return courses.map((course) => ({
    user_id: userId,
    term: course.term,
    subject: course.subject,
    number: course.number,
    title: course.title,
    credits: course.credits,
    grade: course.grade.trim() === '' ? null : course.grade, // Convert empty string to null for DB
  }));
}

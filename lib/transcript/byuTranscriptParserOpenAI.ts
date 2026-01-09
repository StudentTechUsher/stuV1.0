import { z } from 'zod';
import { logError, logInfo } from '@/lib/logger';

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
  gpa: z.number().nullable().optional().describe('Overall undergraduate GPA from transcript, or null if not found'),
  terms: z.array(
    z.object({
      term: z.string().describe('Term/semester label'),
      courses: z.array(
        z.object({
          subject: z.string(),
          number: z.string(),
          title: z.string(),
          credits: z.number(),
          grade: z.string(), // Required field, but can be empty string
        })
      ),
    })
  ),
});

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

    // Define the JSON schema for structured output
    // Note: With strict mode, all properties must be in 'required' array
    // So we make grade required but allow empty string for in-progress courses
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        gpa: {
          type: ['number', 'null'],
          description: 'Overall undergraduate GPA from transcript (e.g., 3.75), or null if not found',
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
            required: ['term', 'courses'],
          },
        },
      },
      required: ['gpa', 'terms'],
    };

    // Construct the prompt with BYU-specific instructions
    const userPrompt = `Extract ALL courses AND the overall GPA from this BYU academic transcript.

**IMPORTANT INSTRUCTIONS:**

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

6. **What to include:**
   - All regular courses
   - Transfer credits (if shown)
   - AP/IB credits (if shown)
   - Concurrent enrollment courses

7. **What to skip from course extraction:**
   - GPA summary lines (extract GPA separately in the gpa field)
   - Total credit lines
   - Header/footer information
   - Administrative notes

Return the data in JSON format with:
- gpa: the overall undergraduate GPA (number) or null if not found
- terms: array of terms, where each term contains an array of courses

Extract every course you can find. Be thorough and precise.`;

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
            content: userPrompt + '\n\nTranscript text:\n' + transcriptText,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'byu_transcript_extraction',
            strict: true,
            schema,
          },
        },
        temperature: 0, // Deterministic output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Log the full error response for debugging
      console.error('OpenAI API Error Response:', errorText);

      logError('OpenAI API request failed for BYU transcript', new Error(errorText), {
        userId,
        action: 'byu_transcript_openai_request',
        httpStatus: response.status,
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

    // Parse the JSON response
    let parsedResponse: ByuTranscriptResponse;
    try {
      const rawJson = JSON.parse(content);

      // Log what we got from OpenAI
      console.log('OpenAI returned:', JSON.stringify(rawJson, null, 2));

      const validationResult = ByuTranscriptResponseSchema.safeParse(rawJson);

      if (!validationResult.success) {
        console.error('OpenAI response validation failed:', validationResult.error);
        console.error('Raw JSON:', JSON.stringify(rawJson, null, 2));
        console.error('Validation errors:', validationResult.error.issues);

        logError('Invalid response structure from OpenAI', validationResult.error, {
          userId,
          action: 'byu_transcript_response_validation',
        });

        throw new ByuTranscriptParseError(
          `OpenAI returned invalid response structure: ${validationResult.error.issues[0]?.message || 'Unknown error'}`
        );
      }

      parsedResponse = validationResult.data;
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      console.error('Content:', content?.substring(0, 500));

      logError('Failed to parse OpenAI JSON response', error, {
        userId,
        action: 'byu_transcript_json_parse',
      });

      throw new ByuTranscriptParseError(
        'Failed to parse OpenAI response as JSON',
        error
      );
    }

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

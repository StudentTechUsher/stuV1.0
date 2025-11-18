import * as yup from 'yup';

/**
 * Shared validation options for consistent error handling
 */
export const VALIDATION_OPTIONS = {
  abortEarly: false,
  stripUnknown: true,
};

// ============================================================================
// Transcript Parsed Event Schema
// ============================================================================

export const transcriptParsedEventSchema = yup.object({
  type: yup
    .string()
    .oneOf(['user.transcript.parsed'])
    .required('Event type is required'),
  status: yup
    .string()
    .oneOf(['parsed', 'failed'])
    .default('parsed')
    .optional(),
  userId: yup.string().required('User ID is required'),
  documentId: yup.string().required('Document ID is required'),
  coursesCount: yup.number().min(0).optional(),
  courses: yup
    .array()
    .of(
      yup.object({
        term: yup.string().required('Course term is required'),
        subject: yup.string().required('Course subject is required'),
        number: yup.string().required('Course number is required'),
        title: yup.string().required('Course title is required'),
        credits: yup.number().min(0).required('Course credits are required'),
        grade: yup.string().optional().nullable(),
        confidence: yup.number().min(0).max(1).optional().nullable(),
      })
    )
    .min(1, 'At least one course is required')
    .required('Courses are required'),
});

export type TranscriptParsedEventInput = yup.InferType<typeof transcriptParsedEventSchema>;

// ============================================================================
// Extract Colors Schema
// ============================================================================

export const extractColorsSchema = yup.object({
  imageUrl: yup.string().url('Must be a valid URL').required('Image URL is required'),
  numColors: yup.number().min(1).max(10).default(5),
});

export type ExtractColorsInput = yup.InferType<typeof extractColorsSchema>;

// ============================================================================
// Chat Completion Schema
// ============================================================================

export const chatCompletionSchema = yup.object({
  messages: yup.array().of(
    yup.object({
      role: yup.string().oneOf(['system', 'user', 'assistant']).required(),
      content: yup.string().required(),
    })
  ).min(1).required('Messages array is required'),
  model: yup.string().default('gpt-4'),
  max_tokens: yup.number().min(1).max(100000).optional(),
  temperature: yup.number().min(0).max(2).optional(),
});

export type ChatCompletionInput = yup.InferType<typeof chatCompletionSchema>;

// ============================================================================
// Send Email Schema
// ============================================================================

export const sendEmailSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  university: yup.string().required('University is required'),
  major: yup.string().required('Major is required'),
  secondMajor: yup.string().optional().nullable(),
  minors: yup.array().of(yup.string()).optional().default([]),
});

export type SendEmailInput = yup.InferType<typeof sendEmailSchema>;

// ============================================================================
// Course Selection Payload Schema (for grad plan generation)
// ============================================================================

export const courseSelectionPayloadSchema = yup.object({
  programs: yup.mixed().required('Programs data is required'),
  generalEducation: yup.mixed().required('General education data is required'),
  selectionMode: yup.string().oneOf(['AUTO', 'MANUAL', 'CHOICE']).default('MANUAL'),
  selectedPrograms: yup.array().of(
    yup.mixed() // Can be string or number
  ).optional(),
  takenCourses: yup.array().of(
    yup.object({
      code: yup.string().required('Course code is required'),
      title: yup.string().required('Course title is required'),
      credits: yup.number().required('Course credits are required'),
      term: yup.string().required('Course term is required'),
      grade: yup.string().required('Course grade is required'),
      status: yup.string().required('Course status is required'),
      source: yup.string().required('Course source is required'),
    })
  ).optional().default([]),
});

export type CourseSelectionPayloadInput = yup.InferType<typeof courseSelectionPayloadSchema>;

// ============================================================================
// Graduation Plan Payload Schema
// ============================================================================

export const graduationPlanPayloadSchema = yup.object({
  studentId: yup.number().required('Student ID is required'),
  planData: yup.mixed().required('Plan data is required'),
  programsInPlan: yup.array().of(yup.number()).default([]),
  isActive: yup.boolean().default(false),
});

export type GraduationPlanPayloadInput = yup.InferType<typeof graduationPlanPayloadSchema>;

// ============================================================================
// Organize Prompt Input Schema
// ============================================================================

export const organizePromptInputSchema = yup.object({
  prompt_name: yup.string().optional(),
  prompt: yup.string().required('Prompt is required'),
  model: yup.string().optional(),
  max_output_tokens: yup.number().min(1).max(100000).optional(),
});

export type OrganizePromptInput = yup.InferType<typeof organizePromptInputSchema>;

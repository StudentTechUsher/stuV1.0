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
  user_id: yup.string().required('User ID is required'),
  document_id: yup.string().required('Document ID is required'),
  courses_count: yup.number().min(0).required('Courses count is required'),
  status: yup.string().oneOf(['parsed', 'failed']).required('Status is required'),
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
  to: yup.string().email('Must be a valid email').required('Recipient email is required'),
  subject: yup.string().required('Subject is required'),
  html: yup.string().required('Email body (HTML) is required'),
  from: yup.string().email('Must be a valid email').optional(),
  replyTo: yup.string().email('Must be a valid email').optional(),
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

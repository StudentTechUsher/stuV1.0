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
  // Fields that may come from client (from create-plan-client.tsx)
  selectedCourses: yup.mixed().optional(),
  programs: yup.mixed().optional(),
  studentType: yup.string().optional(),
  selectionMode: yup.string().oneOf(['AUTO', 'MANUAL', 'CHOICE']).optional(),
  selectedPrograms: yup.array().of(
    yup.mixed() // Can be string or number
  ).optional(),
  takenCourses: yup.array().of(
    yup.object({
      code: yup.string().required('Course code is required'),
      title: yup.string().required('Course title is required'),
      credits: yup.number().required('Course credits are required'),
      term: yup.string().required('Course term is required'),
      grade: yup.string().optional(),
      status: yup.string().optional(),
      source: yup.string().optional(),
    })
  ).optional().default([]),

  // Optional fields from SelectedClassesPayload
  generalEducation: yup.mixed().optional(),
  timestamp: yup.string().optional(),
  genEdPrograms: yup.array().of(yup.string()).optional(),
  assumptions: yup.object().optional(),
  userAddedElectives: yup.array().of(
    yup.object({
      code: yup.string().required('Code is required'),
      title: yup.string().required('Title is required'),
      credits: yup.number().required('Credits are required'),
    })
  ).optional(),
  recommendedElectives: yup.array().of(
    yup.object({
      code: yup.string().optional(),
      title: yup.string().optional(),
      score: yup.number().min(0).max(3).optional(),
      matchReasons: yup.array().of(yup.string()).optional(),
    })
  ).optional().default([]),
  additionalConcerns: yup.object({
    hasAdditionalConcerns: yup.boolean().optional(),
    workStatus: yup.string().oneOf(['not_working', 'part_time', 'full_time']).optional(),
    academicPriority: yup.string().oneOf(['graduate_quickly', 'explore_options', 'balanced']).optional(),
    otherConcerns: yup.string().optional(),
  }).optional(),
  workStatus: yup.string().oneOf(['not_working', 'part_time', 'full_time', 'variable']).optional(),
  suggestedDistribution: yup.array().of(
    yup.object({
      term: yup.string().required(),
      year: yup.number().required(),
      termType: yup.string().oneOf(['primary', 'secondary']).required(),
      suggestedCredits: yup.number().required(),
      minCredits: yup.number().required(),
      maxCredits: yup.number().required(),
      targetCredits: yup.number().optional(),
    })
  ).optional(),
  milestones: yup.lazy((value) => {
    if (Array.isArray(value)) {
      return yup.array().of(
        yup.object({
          id: yup.string().optional(),
          type: yup.string().required(),
          title: yup.string().required(),
          timing: yup.string().oneOf([
            'ai_choose',
            'beginning',
            'middle',
            'before_last_year',
            'after_graduation',
            'specific_term',
          ]).required(),
          term: yup.string().optional(),
          year: yup.number().optional(),
        })
      );
    }

    return yup.object({
      hasMilestones: yup.boolean().required(),
      milestones: yup.array().of(
        yup.object({
          type: yup.string().required(),
          title: yup.string().required(),
          timing: yup.string().oneOf([
            'ai_choose',
            'beginning',
            'middle',
            'before_last_year',
            'after_graduation',
          ]).required(),
        })
      ).optional(),
    }).optional();
  }).optional(),
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

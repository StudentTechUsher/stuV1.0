/**
 * Student Type Tool for Graduation Plan Chatbot
 * Determines if student is undergraduate or graduate
 */

import { z } from 'zod';

// Input validation schema
export const StudentTypeSchema = z.object({
  studentType: z.enum(['undergraduate', 'graduate']),
});

export type StudentTypeInput = z.infer<typeof StudentTypeSchema>;

// Tool result type
export interface StudentTypeResult {
  success: boolean;
  data?: {
    studentType: 'undergraduate' | 'graduate';
  };
  error?: string;
}

// OpenAI Function Calling schema
export const studentTypeToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'select_student_type',
    description: `Determines whether the student is an undergraduate or graduate student.
    Use this tool to:
    - Ask the student if they are pursuing an undergraduate or graduate degree
    - Store their student type for program recommendations

    This affects which programs will be shown in the next step.`,
    parameters: {
      type: 'object',
      properties: {
        studentType: {
          type: 'string',
          enum: ['undergraduate', 'graduate'],
          description: 'The type of student - either "undergraduate" or "graduate"',
        },
      },
      required: ['studentType'],
    },
  },
};

/**
 * Gets description text for each student type
 */
export function getStudentTypeDescription(type: 'undergraduate' | 'graduate'): string {
  if (type === 'undergraduate') {
    return 'Pursuing a Bachelor\'s degree (BA, BS, etc.)';
  }
  return 'Pursuing a Master\'s or Doctoral degree (MS, MA, PhD, etc.)';
}

/**
 * Gets the appropriate message based on student type selection
 */
export function getStudentTypeConfirmationMessage(type: 'undergraduate' | 'graduate'): string {
  if (type === 'undergraduate') {
    return 'Great! As an undergraduate student, I\'ll help you select your major(s), minor(s), and any certificates or general education requirements.';
  }
  return 'Perfect! As a graduate student, I\'ll help you select your graduate program and any additional requirements.';
}

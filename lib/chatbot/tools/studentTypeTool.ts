/**
 * Student Type Tool for Graduation Plan Chatbot
 * Determines if student is undergraduate or graduate
 */

import { z } from 'zod';

// Input validation schema
export const StudentTypeSchema = z.object({
  studentType: z.enum(['undergraduate', 'honor', 'graduate']),
});

export type StudentTypeInput = z.infer<typeof StudentTypeSchema>;

// Tool result type
export interface StudentTypeResult {
  success: boolean;
  data?: {
    studentType: 'undergraduate' | 'honor' | 'graduate';
  };
  error?: string;
}

// OpenAI Function Calling schema
export const studentTypeToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'select_student_type',
    description: `Determines whether the student is an undergraduate, honors, or graduate student.
    Use this tool to:
    - Ask the student if they are pursuing an undergraduate, honors, or graduate degree
    - Store their student type for program recommendations

    This affects which programs will be shown in the next step.`,
    parameters: {
      type: 'object',
      properties: {
        studentType: {
          type: 'string',
          enum: ['undergraduate', 'honor', 'graduate'],
          description: 'The type of student - "undergraduate", "honor", or "graduate"',
        },
      },
      required: ['studentType'],
    },
  },
};

/**
 * Gets description text for each student type
 */
export function getStudentTypeDescription(type: 'undergraduate' | 'honor' | 'graduate'): string {
  if (type === 'undergraduate') {
    return 'Pursuing a Bachelor\'s degree (BA, BS, etc.)';
  }
  if (type === 'honor') {
    return 'Undergraduate honors student with additional honors requirements';
  }
  return 'Pursuing a Master\'s or Doctoral degree (MS, MA, PhD, etc.)';
}

/**
 * Gets the appropriate message based on student type selection
 */
export function getStudentTypeConfirmationMessage(type: 'undergraduate' | 'honor' | 'graduate'): string {
  if (type === 'undergraduate') {
    return 'Great! As an undergraduate student, I\'ll help you select your major(s), minor(s), and any certificates or general education requirements.';
  }
  if (type === 'honor') {
    return 'Great! As an honors student, I\'ll help you select your major(s), minor(s), and honors requirements alongside your general education courses.';
  }
  return 'Perfect! As a graduate student, I\'ll help you select your graduate program and any additional requirements.';
}

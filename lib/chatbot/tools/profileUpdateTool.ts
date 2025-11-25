/**
 * Profile Update Tool for Graduation Plan Chatbot
 * Collects/updates: est_grad_date, est_grad_sem, career_goals
 */

import { z } from 'zod';

// Input validation schema
export const ProfileUpdateSchema = z.object({
  estGradDate: z.string().optional().nullable(),
  estGradSem: z.enum(['Fall', 'Spring', 'Summer', 'Winter']).optional().nullable(),
  careerGoals: z.string().min(1).optional().nullable(),
  isGraduationOnly: z.boolean().optional(),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

// Tool result type
export interface ProfileUpdateResult {
  success: boolean;
  data?: {
    estGradDate: string | null;
    estGradSem: string | null;
    careerGoals: string | null;
  };
  error?: string;
}

// OpenAI Function Calling schema
export const profileUpdateToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'update_profile',
    description: `Updates the student's profile with graduation timeline and career goals.
    Use this tool to collect or update:
    - Estimated graduation date (estGradDate)
    - Estimated graduation semester (estGradSem)
    - Career goals (careerGoals)

    If the user already has values for these fields, present them and ask if they'd like to update.
    All fields are optional - only include fields the user provides.`,
    parameters: {
      type: 'object',
      properties: {
        estGradDate: {
          type: 'string',
          description: 'Estimated graduation date in YYYY-MM-DD format (e.g., 2025-05-15)',
        },
        estGradSem: {
          type: 'string',
          enum: ['Fall', 'Spring', 'Summer'],
          description: 'Estimated graduation semester',
        },
        careerGoals: {
          type: 'string',
          description: 'Student\'s career goals or target career path',
        },
      },
      required: [], // All fields are optional
    },
  },
};

/**
 * Determines if profile update is needed based on existing data
 */
export function shouldRequestProfileUpdate(profile: {
  est_grad_date?: string | null;
  est_grad_sem?: string | null;
  career_goals?: string | null;
}): {
  needsUpdate: boolean;
  missingFields: string[];
  hasValues: boolean;
} {
  const missingFields: string[] = [];

  if (!profile.est_grad_date) {
    missingFields.push('graduation date');
  }
  if (!profile.est_grad_sem) {
    missingFields.push('graduation semester');
  }
  if (!profile.career_goals) {
    missingFields.push('career goals');
  }

  return {
    needsUpdate: missingFields.length > 0,
    missingFields,
    hasValues: missingFields.length < 3,
  };
}

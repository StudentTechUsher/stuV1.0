/**
 * Program Selection Tool for Graduation Plan Chatbot
 * Allows students to select their major(s), minor(s), or graduate programs
 */

import { z } from 'zod';
import { Json } from '@/lib/database/types';

// Program selection for undergraduate students
export const UndergraduateProgramSchema = z.object({
  majorIds: z.array(z.string()).min(1, 'At least one major is required'),
  minorIds: z.array(z.string()).optional(),
  genEdIds: z.array(z.string()).optional(),
});

// Program selection for graduate students
export const GraduateProgramSchema = z.object({
  graduateProgramIds: z.array(z.string()).min(1, 'At least one graduate program is required'),
});

// Combined schema
export const ProgramSelectionSchema = z.discriminatedUnion('studentType', [
  z.object({
    studentType: z.literal('undergraduate'),
    programs: UndergraduateProgramSchema,
  }),
  z.object({
    studentType: z.literal('graduate'),
    programs: GraduateProgramSchema,
  }),
]);

export type ProgramSelectionInput = z.infer<typeof ProgramSelectionSchema>;

// Program option interface
export interface ProgramOption {
  id: string;
  name: string;
  program_type: string;
  slug?: string;
  course_flow?: Json | null;
  requirements?: Json | null;
}

// Tool result type
export interface ProgramSelectionResult {
  success: boolean;
  data?: {
    studentType: 'undergraduate' | 'graduate';
    selectedPrograms: number[];
  };
  error?: string;
}

// OpenAI Function Calling schema
export const programSelectionToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'select_programs',
    description: `Allows the student to select their academic programs.

    For undergraduate students:
    - Select one or more majors (required)
    - Optionally select minor(s)
    - Optionally select general education requirements

    For graduate students:
    - Select one or more graduate programs (Master's, PhD, etc.)

    This tool presents a searchable interface with programs filtered by student type.`,
    parameters: {
      type: 'object',
      properties: {
        studentType: {
          type: 'string',
          enum: ['undergraduate', 'graduate'],
          description: 'The type of student (determines which programs are shown)',
        },
        programs: {
          type: 'object',
          description: 'Selected programs based on student type',
          oneOf: [
            {
              properties: {
                majorIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of selected major program IDs',
                },
                minorIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of selected minor program IDs (optional)',
                },
                genEdIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of selected general education program IDs (optional)',
                },
              },
              required: ['majorIds'],
            },
            {
              properties: {
                graduateProgramIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of selected graduate program IDs',
                },
              },
              required: ['graduateProgramIds'],
            },
          ],
        },
      },
      required: ['studentType', 'programs'],
    },
  },
};

/**
 * Fetches programs from API based on type
 */
export async function fetchProgramsByType(
  universityId: number,
  programType: 'major' | 'minor' | 'graduate' | 'gen_ed',
  studentMetadata?: {
    admissionYear?: number | null;
    isTransfer?: boolean | null;
  }
): Promise<ProgramOption[]> {
  try {
    const params = new URLSearchParams({
      universityId: String(universityId),
      type: programType,
    });

    // Add student metadata for gen_ed filtering
    if (programType === 'gen_ed' && studentMetadata) {
      if (studentMetadata.admissionYear) {
        params.append('admissionYear', String(studentMetadata.admissionYear));
      }
      if (studentMetadata.isTransfer !== null && studentMetadata.isTransfer !== undefined) {
        params.append('isTransfer', String(studentMetadata.isTransfer));
      }
    }

    const response = await fetch(`/api/programs?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${programType} programs`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${programType} programs:`, error);
    return [];
  }
}

/**
 * Gets the confirmation message based on selections
 */
export function getProgramSelectionConfirmationMessage(
  studentType: 'undergraduate' | 'graduate',
  programCount: number
): string {
  if (studentType === 'undergraduate') {
    return `Perfect! I've recorded your ${programCount} program${programCount > 1 ? 's' : ''}. Next, let's determine how you'd like to select your courses.`;
  }
  return `Excellent! I've recorded your graduate program${programCount > 1 ? 's' : ''}. Next, let's determine how you'd like to select your courses.`;
}

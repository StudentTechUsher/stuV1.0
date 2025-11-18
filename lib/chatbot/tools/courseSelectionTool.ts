/**
 * Course Selection Tool for Graduation Plan Chatbot
 * Allows students to manually select courses for their program requirements
 */

import { z } from 'zod';

// Course selection entry
export const CourseEntrySchema = z.object({
  code: z.string(),
  title: z.string(),
  credits: z.union([z.number(), z.string()]),
  prerequisite: z.string().optional(),
});

// Requirement course mapping
export const RequirementCoursesSchema = z.object({
  requirementId: z.string(),
  requirementDescription: z.string(),
  selectedCourses: z.array(CourseEntrySchema).min(1, 'At least one course is required'),
});

// Program course selection
export const ProgramCourseSelectionSchema = z.object({
  programId: z.string(),
  programName: z.string(),
  programType: z.string(),
  requirements: z.array(RequirementCoursesSchema),
});

// Combined course selection (GenEd + Programs)
export const CourseSelectionSchema = z.object({
  selectionMode: z.literal('manual'),
  generalEducation: z.array(RequirementCoursesSchema).optional(),
  programs: z.array(ProgramCourseSelectionSchema).min(1, 'At least one program is required'),
  userAddedElectives: z.array(CourseEntrySchema).optional(),
});

export type CourseSelectionInput = z.infer<typeof CourseSelectionSchema>;
export type CourseEntry = z.infer<typeof CourseEntrySchema>;
export type RequirementCourses = z.infer<typeof RequirementCoursesSchema>;
export type ProgramCourseSelection = z.infer<typeof ProgramCourseSelectionSchema>;

// Tool result type
export interface CourseSelectionResult {
  success: boolean;
  data?: CourseSelectionInput;
  error?: string;
}

// OpenAI Function Calling schema
export const courseSelectionToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'select_courses',
    description: `Allows the student to manually select specific courses for each program requirement.

    For each selected program, the student will:
    - Review all degree requirements
    - Select courses that fulfill each requirement
    - Choose from available course options for each requirement
    - Optionally add elective courses

    This tool presents an organized interface showing requirements grouped by program,
    with course selection dropdowns for each requirement.`,
    parameters: {
      type: 'object',
      properties: {
        selectionMode: {
          type: 'string',
          enum: ['manual'],
          description: 'Course selection mode (always manual for this tool)',
        },
        generalEducation: {
          type: 'array',
          description: 'Selected courses for general education requirements (undergraduate only)',
          items: {
            type: 'object',
            properties: {
              requirementId: {
                type: 'string',
                description: 'Unique identifier for the requirement',
              },
              requirementDescription: {
                type: 'string',
                description: 'Description of the requirement',
              },
              selectedCourses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    title: { type: 'string' },
                    credits: { type: ['number', 'string'] },
                    prerequisite: { type: 'string' },
                  },
                  required: ['code', 'title', 'credits'],
                },
              },
            },
            required: ['requirementId', 'requirementDescription', 'selectedCourses'],
          },
        },
        programs: {
          type: 'array',
          description: 'Selected courses for each program',
          items: {
            type: 'object',
            properties: {
              programId: {
                type: 'string',
                description: 'Program ID',
              },
              programName: {
                type: 'string',
                description: 'Program name',
              },
              programType: {
                type: 'string',
                description: 'Program type (major, minor, graduate)',
              },
              requirements: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    requirementId: { type: 'string' },
                    requirementDescription: { type: 'string' },
                    selectedCourses: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          title: { type: 'string' },
                          credits: { type: ['number', 'string'] },
                          prerequisite: { type: 'string' },
                        },
                        required: ['code', 'title', 'credits'],
                      },
                    },
                  },
                  required: ['requirementId', 'requirementDescription', 'selectedCourses'],
                },
              },
            },
            required: ['programId', 'programName', 'programType', 'requirements'],
          },
        },
        userAddedElectives: {
          type: 'array',
          description: 'Additional elective courses chosen by the student',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              title: { type: 'string' },
              credits: { type: 'number' },
            },
            required: ['code', 'title', 'credits'],
          },
        },
      },
      required: ['selectionMode', 'programs'],
    },
  },
};

/**
 * Gets confirmation message after course selection
 */
export function getCourseSelectionConfirmationMessage(
  programCount: number,
  totalCourses: number
): string {
  return `Excellent! I've recorded your course selections for ${programCount} program${programCount > 1 ? 's' : ''} (${totalCourses} courses total). Now I'll organize these into a graduation timeline.`;
}

/**
 * Helper to count total courses selected
 */
export function countTotalCourses(data: CourseSelectionInput): number {
  let total = 0;

  // Count general education courses
  if (data.generalEducation) {
    data.generalEducation.forEach(req => {
      total += req.selectedCourses.length;
    });
  }

  // Count program courses
  data.programs.forEach(program => {
    program.requirements.forEach(req => {
      total += req.selectedCourses.length;
    });
  });

  // Count electives
  if (data.userAddedElectives) {
    total += data.userAddedElectives.length;
  }

  return total;
}

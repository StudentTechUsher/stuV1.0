/**
 * Additional Concerns Tool
 * Collects student preferences and constraints for grad plan generation
 */

import { z } from 'zod';

// Work status options
export const WorkStatusSchema = z.enum([
  'not_working',
  'part_time',
  'full_time',
]);

export type WorkStatus = z.infer<typeof WorkStatusSchema>;

// Academic priority options
export const AcademicPrioritySchema = z.enum([
  'graduate_quickly',
  'explore_options',
  'balanced',
]);

export type AcademicPriority = z.infer<typeof AcademicPrioritySchema>;

// Main input schema
export const AdditionalConcernsSchema = z.object({
  hasAdditionalConcerns: z.boolean(),
  workStatus: WorkStatusSchema.optional(),
  academicPriority: AcademicPrioritySchema.optional(),
  otherConcerns: z.string().optional(),
});

export type AdditionalConcernsInput = z.infer<typeof AdditionalConcernsSchema>;

// OpenAI tool definition
export const additionalConcernsToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'collect_additional_concerns',
    description: `Collects additional preferences and constraints from the student to customize their graduation plan. This includes work status during studies, academic priorities, and any other special considerations.`,
    parameters: {
      type: 'object',
      properties: {
        hasAdditionalConcerns: {
          type: 'boolean',
          description: 'Whether the student has additional concerns or preferences to share',
        },
        workStatus: {
          type: 'string',
          enum: ['not_working', 'part_time', 'full_time'],
          description: 'Student work status during studies: not_working (not planning to work), part_time (working part-time), or full_time (working full-time)',
        },
        academicPriority: {
          type: 'string',
          enum: ['graduate_quickly', 'explore_options', 'balanced'],
          description: 'Student academic priorities: graduate_quickly (prioritize finishing degree quickly), explore_options (focus on exploring academic options), or balanced (balance between both)',
        },
        otherConcerns: {
          type: 'string',
          description: 'Any other concerns or preferences the student wants to share (free text)',
        },
      },
      required: ['hasAdditionalConcerns'],
    },
  },
};

// Confirmation message generator
export function getAdditionalConcernsConfirmationMessage(input: AdditionalConcernsInput): string {
  if (!input.hasAdditionalConcerns) {
    return "Perfect! We have all the information we need. Let me now generate your personalized graduation plan based on your selections.";
  }

  const parts: string[] = ["Great! I've noted your preferences:"];

  if (input.workStatus) {
    const workStatusText = {
      not_working: "You're not planning to work during your studies",
      part_time: "You'll be working part-time during your studies",
      full_time: "You'll be working full-time during your studies",
    };
    parts.push(`- ${workStatusText[input.workStatus]}`);
  }

  if (input.academicPriority) {
    const priorityText = {
      graduate_quickly: "You want to prioritize graduating as quickly as possible",
      explore_options: "You want to focus on exploring different academic options",
      balanced: "You want a balanced approach between speed and exploration",
    };
    parts.push(`- ${priorityText[input.academicPriority]}`);
  }

  if (input.otherConcerns) {
    parts.push(`- Additional notes: ${input.otherConcerns}`);
  }

  parts.push("\nI'll take these preferences into account when creating your graduation plan. Let me generate it now!");

  return parts.join('\n');
}

// Helper: Get label for work status
export function getWorkStatusLabel(status: WorkStatus): string {
  const labels: Record<WorkStatus, string> = {
    not_working: 'Not planning to work',
    part_time: 'Working part-time',
    full_time: 'Working full-time',
  };
  return labels[status];
}

// Helper: Get label for academic priority
export function getAcademicPriorityLabel(priority: AcademicPriority): string {
  const labels: Record<AcademicPriority, string> = {
    graduate_quickly: 'Graduate as quickly as possible',
    explore_options: 'Explore academic options',
    balanced: 'Balanced approach',
  };
  return labels[priority];
}

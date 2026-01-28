/**
 * Milestone Tool
 * Collects student milestones for grad plan generation
 */

import { z } from 'zod';
// import { EventType } from '@/components/grad-planner/types';

// Milestone timing options
export const MilestoneTimingSchema = z.enum([
  'ai_choose',
  'beginning',
  'middle',
  'before_last_year',
  'after_graduation',
]);

export type MilestoneTiming = z.infer<typeof MilestoneTimingSchema>;

// Milestone schema
export const MilestoneSchema = z.object({
  type: z.string(), // EventType string
  title: z.string(),
  timing: MilestoneTimingSchema,
});

export type Milestone = z.infer<typeof MilestoneSchema>;

// Main input schema
export const MilestoneInputSchema = z.object({
  hasMilestones: z.boolean(),
  milestones: z.array(MilestoneSchema).optional(),
});

export type MilestoneInput = z.infer<typeof MilestoneInputSchema>;

// OpenAI tool definition
export const milestoneToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'collect_milestones',
    description: `Collects important milestones the student wants to achieve during their academic journey. Examples include internships, study abroad, applying for graduate school, etc.`,
    parameters: {
      type: 'object',
      properties: {
        hasMilestones: {
          type: 'boolean',
          description: 'Whether the student wants to add milestones to their plan',
        },
        milestones: {
          type: 'array',
          description: 'List of milestones the student wants to achieve',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Type of milestone (e.g., "Internship", "Apply for Graduate School", "Study Abroad")',
              },
              title: {
                type: 'string',
                description: 'Name/title of the milestone',
              },
              timing: {
                type: 'string',
                enum: ['ai_choose', 'beginning', 'middle', 'before_last_year', 'after_graduation'],
                description: 'When the student wants to achieve this milestone',
              },
            },
            required: ['type', 'title', 'timing'],
          },
        },
      },
      required: ['hasMilestones'],
    },
  },
};

// Confirmation message generator
export function getMilestoneConfirmationMessage(input: MilestoneInput): string {
  if (!input.hasMilestones || !input.milestones || input.milestones.length === 0) {
    return "No problem! We'll create your plan without specific milestones. You can always add them later when viewing your plan.";
  }

  const parts: string[] = ["Great! I've noted your milestones:"];

  input.milestones.forEach((milestone) => {
    const timingText = getMilestoneTimingLabel(milestone.timing);
    parts.push(`- **${milestone.title}** (${timingText})`);
  });

  parts.push("\nI'll incorporate these milestones when creating your graduation plan!");

  return parts.join('\n');
}

// Helper: Get label for milestone timing
export function getMilestoneTimingLabel(timing: MilestoneTiming): string {
  const labels: Record<MilestoneTiming, string> = {
    ai_choose: 'AI will choose optimal timing',
    beginning: 'Towards the beginning',
    middle: 'Towards the middle',
    before_last_year: 'Before final year',
    after_graduation: 'After graduation',
  };
  return labels[timing];
}

/**
 * Career Suggestions Tool
 * AI suggests career paths based on student interests and responses
 */

import { z } from 'zod';

// Individual career suggestion schema
export const CareerSuggestionSchema = z.object({
  title: z.string(),
  match_score: z.number().min(0).max(100),
  reason: z.string(),
  job_growth: z.string(),
  median_salary: z.string().optional(),
  related_programs: z.array(z.string()).optional(),
});

export type CareerSuggestion = z.infer<typeof CareerSuggestionSchema>;

// Main input schema
export const CareerSuggestionsSchema = z.object({
  careers: z.array(CareerSuggestionSchema).min(1).max(5),
  summary: z.string().optional(),
});

export type CareerSuggestionsInput = z.infer<typeof CareerSuggestionsSchema>;

// OpenAI tool definition
export const careerSuggestionsToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'suggest_careers',
    description: `After asking the student 3-5 discovery questions about their interests, skills, and preferences, suggest 2-4 career paths that match their profile. Include reasoning for each suggestion based on their responses.`,
    parameters: {
      type: 'object',
      properties: {
        careers: {
          type: 'array',
          description: 'Array of 2-4 career suggestions ranked by match score',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The career title (e.g., "Software Engineer", "Data Scientist")',
              },
              match_score: {
                type: 'number',
                description: 'Match score from 0-100 based on student responses',
                minimum: 0,
                maximum: 100,
              },
              reason: {
                type: 'string',
                description: 'Personalized explanation of why this career matches their interests and skills',
              },
              job_growth: {
                type: 'string',
                description: 'Job market outlook and growth projections',
              },
              median_salary: {
                type: 'string',
                description: 'Typical salary range (optional)',
              },
              related_programs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Academic programs that lead to this career (optional)',
              },
            },
            required: ['title', 'match_score', 'reason', 'job_growth'],
          },
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the student profile based on their responses',
        },
      },
      required: ['careers'],
    },
  },
};

// Career pathfinder system prompt
export const CAREER_PATHFINDER_SYSTEM_PROMPT = `You are a career counselor helping a student discover potential career paths.

Your goal is to:
1. Ask 3-5 targeted questions to understand their interests, skills, and preferences
2. Listen carefully to their responses and ask follow-up questions when appropriate
3. After gathering enough information, use the suggest_careers tool to provide 2-4 career suggestions

Questions to consider (don't ask all of these - pick 3-5 most relevant):
- What subjects or activities do they find most engaging?
- Do they prefer working with people, data, or things?
- What kind of work environment appeals to them? (office, remote, outdoors, lab, etc.)
- Are they interested in creative work, analytical work, or hands-on work?
- Do they prefer structure and routine, or variety and unpredictability?
- What are their strengths? (problem-solving, communication, creativity, organization, etc.)
- What impact do they want to have? (help individuals, solve technical problems, create things, etc.)
- Any specific interests or hobbies that excite them?

Keep your tone friendly, encouraging, and conversational. Ask one question at a time and build on their responses.`;

// Initial career pathfinder message
export const CAREER_PATHFINDER_INITIAL_MESSAGE = `I'd love to help you discover the right career path! 🎯

Let me ask you a few questions to understand your interests and strengths better. Don't worry - there are no wrong answers, just honest ones.

**First question:** What subjects, activities, or topics do you find yourself naturally drawn to or excited about? (Think about classes you've enjoyed, hobbies, or things you like to learn about in your free time)`;

// Helper: Generate confirmation message after career selection
export function getCareerSelectionConfirmationMessage(selectedCareer: string): string {
  return `Perfect! I've recorded **${selectedCareer}** as your career goal. This will help us tailor your graduation plan to align with this career path.`;
}

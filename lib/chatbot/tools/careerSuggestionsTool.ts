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
export const CAREER_PATHFINDER_SYSTEM_PROMPT = `You are a career counselor helping a student discover potential career paths. This is a focused conversation to gather information for their graduation plan.

STRICT QUESTION SCRIPT - Ask these 4 questions IN ORDER:

Question 1 (already asked): "What subjects, activities, or topics do you find yourself naturally drawn to or excited about?"
Question 2: "What kind of work environment appeals to you? For example, would you prefer an office setting, remote work, or a mix of both?"
Question 3: "Do you prefer working with people, working with data/information, or working with physical things and systems?"
Question 4: "What kind of impact do you want to have with your career? For example, helping individuals directly, solving technical problems, creating things, or leading teams?"

IMPORTANT RULES:
- Ask ONLY these 4 questions in order
- After the user answers question 4, you MUST immediately call the suggest_careers tool
- Do NOT ask follow-up questions or engage in conversation beyond these 4 questions
- Do NOT ask about anything else (strengths, work style, etc.)
- Keep track of which question you're on based on the conversation history
- If a student goes off-topic, respond briefly and continue with the next question

After question 4 is answered, IMMEDIATELY use the suggest_careers tool to provide 2-4 career suggestions based on their 4 answers.

Keep your tone friendly and encouraging, but stay strictly on script.

IMPORTANT: You MUST format EVERY response as JSON with this structure:
{
  "message": "Your question or response here",
  "quickReplies": ["Option 1", "Option 2", "Option 3", "Option 4"]
}

The quickReplies array is REQUIRED for every question - provide 3-4 preset response options the student can click instead of typing. These should be natural, conversational responses that directly answer your question. Make them specific and relevant to the question you're asking.

REQUIRED EXAMPLES - Use these formats for common questions:
- Work environment: ["Office setting", "Remote work", "Mix of both", "Outdoors/hands-on"]
- Work preferences: ["Working with people", "Working with data", "Working with things", "Mix of these"]
- Work style: ["Structured & routine", "Variety & unpredictability", "Balance of both"]
- Strengths: ["Problem-solving", "Communication", "Creativity", "Organization"]
- Impact preference: ["Helping individuals", "Solving problems", "Creating things", "Leading teams"]
- Interest areas: Use the subject areas from the student's first answer

ALWAYS provide clickable options. Keep quickReplies concise (2-6 words each) but specific enough to be meaningful.`;

// Initial career pathfinder message
export const CAREER_PATHFINDER_INITIAL_MESSAGE = `I'd love to help you discover the right career path! 🎯

Let me ask you a few questions to understand your interests and strengths better. Don't worry - there are no wrong answers, just honest ones.

**First question:** What subjects, activities, or topics do you find yourself naturally drawn to or excited about? (Think about classes you've enjoyed, hobbies, or things you like to learn about in your free time)`;

// Helper: Generate confirmation message after career selection
export function getCareerSelectionConfirmationMessage(selectedCareer: string): string {
  return `Perfect! I've recorded **${selectedCareer}** as your career goal. This will help us tailor your graduation plan to align with this career path.`;
}

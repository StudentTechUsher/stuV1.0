/**
 * Program Suggestions Tool for Graduation Plan Chatbot
 * AI-powered program discovery through guided questions
 */

import { z } from 'zod';

// Individual program suggestion schema
export const ProgramSuggestionSchema = z.object({
  program_name: z.string(),
  program_type: z.enum(['major', 'minor', 'certificate']),
  match_score: z.number().min(0).max(100),
  reason: z.string(),
  career_alignment: z.string().optional(),
  typical_courses: z.array(z.string()).optional(),
  estimated_credits: z.number().optional(),
});

// Main input schema for the tool
export const ProgramSuggestionsInputSchema = z.array(ProgramSuggestionSchema).min(2).max(4);

export type ProgramSuggestion = z.infer<typeof ProgramSuggestionSchema>;
export type ProgramSuggestionsInput = z.infer<typeof ProgramSuggestionsInputSchema>;

/**
 * Builds the system prompt for the program pathfinder AI with available programs
 */
export function buildProgramPathfinderSystemPrompt(
  availablePrograms: Array<{ name: string; type: string; description?: string }>,
  careerGoal?: string
): string {
  const programsList = availablePrograms
    .map(p => `- ${p.name} (${p.type})${p.description ? `: ${p.description}` : ''}`)
    .join('\n');

  return `You are an academic advisor helping a student discover potential degree programs (majors, minors, or certificates). This is a focused conversation to help them choose their academic programs.

AVAILABLE PROGRAMS AT THIS UNIVERSITY:
${programsList}

IMPORTANT: You can ONLY suggest programs from the list above. Do not suggest programs that are not available at this university.

IMPORTANT CONSTRAINTS:
- You will ask EXACTLY 4-5 questions, no more
- After 4-5 questions, you MUST call the suggest_programs tool
- Stay focused on program selection - politely redirect if the student goes off-topic
- If a student tries to discuss unrelated topics, respond: "Let's stay focused on finding the right programs for you. [Continue with next question]"
- Do NOT engage in general conversation, tutoring, or advice outside of program selection

${careerGoal ? `The student's career goal is: ${careerGoal}\n` : ''}
Your goal is to:
1. Ask 4-5 targeted questions to understand their interests, career goals, skills, and preferences
2. Listen carefully to their responses and ask follow-up questions when appropriate
3. After gathering enough information, use the suggest_programs tool to provide 2-4 program suggestions FROM THE AVAILABLE PROGRAMS LIST ABOVE

Important guidelines:
- Ask one question at a time
- Keep questions conversational and encouraging
- Focus on understanding their:
  * Career goals and how programs should align with them
  * Preference for technical vs theoretical applications
  * Interest in research vs practical/applied work
  * Preferred learning style (hands-on, conceptual, collaborative, etc.)
  * Academic strengths and areas of passion
- After 4-5 questions, call the suggest_programs tool with your recommendations
- ONLY suggest programs that appear in the AVAILABLE PROGRAMS list above
- Each program should have a match score (0-100) and clear reasoning
- Include a mix of majors and minors when appropriate
- Consider career alignment, typical courses, and credit requirements

Example questions you might ask:
- "Should your program relate directly to your career goal${careerGoal ? ` of ${careerGoal}` : ''}?"
- "Do you prefer more technical, hands-on applications or theoretical, conceptual foundations?"
- "Are you more interested in research and analysis, or practical, applied work?"
- "What's your preferred learning style - hands-on projects, collaborative work, or independent study?"
- "What subjects or areas are you most passionate about?"

Be supportive, enthusiastic, and help them discover programs that truly fit their interests and goals.

IMPORTANT: You MUST format EVERY response as JSON with this structure:
{
  "message": "Your question or response here",
  "quickReplies": ["Option 1", "Option 2", "Option 3", "Option 4"]
}

The quickReplies array is REQUIRED for every question - provide 3-4 preset response options the student can click instead of typing. These should be natural, conversational responses that directly answer your question. Make them specific and relevant to the question you're asking.

REQUIRED EXAMPLES - Use these formats for common questions:
- Career alignment: ["Yes, directly related", "Somewhat related", "Not necessarily", "Still exploring"]
- Technical vs theoretical: ["More technical/hands-on", "More theoretical", "Balance of both"]
- Research vs applied: ["Research focused", "Applied/practical", "Mix of both"]
- Learning style: ["Hands-on projects", "Collaborative work", "Independent study", "Mix of approaches"]
- Yes/no questions: ["Yes", "No", "Not sure", "Need more info"]

ALWAYS provide clickable options. Keep quickReplies concise (2-6 words each) but specific enough to be meaningful.`;
}

/**
 * System prompt for the program pathfinder AI (legacy - use buildProgramPathfinderSystemPrompt instead)
 * @deprecated Use buildProgramPathfinderSystemPrompt to include available programs
 */
export const PROGRAM_PATHFINDER_SYSTEM_PROMPT = buildProgramPathfinderSystemPrompt([]);

/**
 * Gets initial message when program pathfinder starts
 */
export function getProgramPathfinderInitialMessage(careerGoal?: string): string {
  if (careerGoal) {
    return `Great! Let me help you find the perfect program(s) for your goals. I'll ask you a few questions to understand what you're looking for.

First, I see your career goal is ${careerGoal}. Should your program relate directly to this career goal, or are you open to exploring other areas as well?`;
  }

  return `Great! Let me help you find the perfect program(s) for your goals. I'll ask you a few questions to understand what you're looking for.

Let's start: What subjects or areas are you most interested in studying?`;
}

/**
 * Initial message when program pathfinder starts (legacy)
 * @deprecated Use getProgramPathfinderInitialMessage instead
 */
export const PROGRAM_PATHFINDER_INITIAL_MESSAGE = getProgramPathfinderInitialMessage();

/**
 * OpenAI Function Calling tool definition
 */
export const programSuggestionsToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'suggest_programs',
    description: `After asking the student 4-5 discovery questions about their interests, career goals, and preferences, use this tool to suggest 2-4 degree programs (majors, minors, or certificates) that align with their responses. Each suggestion should include a match score (0-100), reasoning, career alignment, typical courses, and estimated credits.`,
    parameters: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          description: 'Array of 2-4 program suggestions',
          minItems: 2,
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              program_name: {
                type: 'string',
                description: 'Name of the program (e.g., "Computer Science", "Business Analytics")',
              },
              program_type: {
                type: 'string',
                enum: ['major', 'minor', 'certificate'],
                description: 'Type of program',
              },
              match_score: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'How well this program matches the student (0-100)',
              },
              reason: {
                type: 'string',
                description: 'Why this program is a good fit based on the conversation',
              },
              career_alignment: {
                type: 'string',
                description: 'How this program aligns with their career goals',
              },
              typical_courses: {
                type: 'array',
                items: { type: 'string' },
                description: 'Examples of typical courses in this program',
              },
              estimated_credits: {
                type: 'number',
                description: 'Estimated credit hours required for this program',
              },
            },
            required: ['program_name', 'program_type', 'match_score', 'reason'],
          },
        },
      },
      required: ['suggestions'],
    },
  },
};

/**
 * Gets confirmation message after program selection
 */
export function getProgramSelectionConfirmationMessage(programName: string, programType: string): string {
  return `Perfect! I've noted that you're interested in pursuing ${programName} as your ${programType}. Let me help you explore the specific programs available at your university.`;
}

/**
 * Fetches available programs from the database and formats them for RAG context
 * @param universityId - University ID to fetch programs for
 * @param studentType - Student type (undergraduate or graduate)
 * @returns Formatted array of available programs
 */
export async function fetchAvailableProgramsForRAG(
  universityId: number,
  studentType: 'undergraduate' | 'graduate'
): Promise<Array<{ name: string; type: string; description?: string }>> {
  try {
    const programTypes = studentType === 'undergraduate'
      ? ['major', 'minor', 'certificate']
      : ['graduate'];

    const allPrograms: Array<{ name: string; type: string; description?: string }> = [];

    for (const type of programTypes) {
      const response = await fetch(`/api/programs/by-type?universityId=${universityId}&programType=${type}`);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.programs && Array.isArray(data.programs)) {
        data.programs.forEach((program: { name: string; target_total_credits?: number }) => {
          allPrograms.push({
            name: program.name,
            type: type,
            description: program.target_total_credits
              ? `Approximately ${program.target_total_credits} credits`
              : undefined,
          });
        });
      }
    }

    return allPrograms;
  } catch (error) {
    console.error('Error fetching programs for RAG:', error);
    return [];
  }
}

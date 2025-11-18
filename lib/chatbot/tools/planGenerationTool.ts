/**
 * Graduation Plan Generation Tool
 * Uses AI to generate a complete graduation plan based on collected user data
 */

import { z } from 'zod';

// Individual course in the graduation plan
export const PlanCourseSchema = z.object({
  course_code: z.string().describe('Course code (e.g., "CS 101" or "Apply to Program")'),
  credits: z.number().describe('Credit hours for this course'),
  term: z.string().describe('Term to take this course (e.g., "Fall 2024", "Spring 2025")'),
  notes: z.string().optional().describe('Any notes, assumptions, or special instructions'),
  is_completed: z.boolean().default(false).describe('Whether this course is from the transcript (already completed)'),
});

export type PlanCourse = z.infer<typeof PlanCourseSchema>;

// Full graduation plan response
export const GraduationPlanResponseSchema = z.object({
  summary_message: z.string().describe('A friendly message to the student about their graduation plan'),
  plan: z.array(PlanCourseSchema).describe('The complete graduation plan as an array of courses'),
});

export type GraduationPlanResponse = z.infer<typeof GraduationPlanResponseSchema>;
export type GraduationPlan = z.infer<typeof GraduationPlanResponseSchema>['plan'];

/**
 * Builds the system prompt for AI graduation plan generation
 */
export function buildPlanGenerationSystemPrompt(): string {
  return `You are an expert academic advisor helping students create detailed graduation plans.

Your task is to generate a comprehensive, semester-by-semester graduation plan that:

1. **Preserves completed courses**: Any courses from the student's transcript are ALREADY COMPLETED and should be included exactly as provided, with is_completed: true
2. **Follows program requirements**: Ensure all required courses for the student's major(s), minor(s), and general education are included
3. **Respects prerequisites**: Schedule courses in the correct order based on typical prerequisite chains
4. **Balances course load**: Aim for 12-18 credits per semester (15-16 is ideal for full-time students)
5. **Considers course offerings**: Assume typical fall/spring offerings unless noted otherwise
6. **Includes milestones**: Add entries for "Apply to Program" (if applicable) and "Apply for Graduation" in appropriate terms
7. **Adds helpful notes**: Include assumptions, warnings about prerequisites, or recommendations

**Important Guidelines:**
- Start with completed courses from the transcript (is_completed: true)
- Then schedule remaining required courses
- Then add selected electives
- Add "Apply to Program" milestone if the student is not yet admitted to their major
- Add "Apply for Graduation" milestone in the semester before their expected graduation
- Use the format "Season Year" for terms (e.g., "Fall 2024", "Spring 2025", "Summer 2025")
- For milestone entries like "Apply to Program", use 0 credits
- Include notes for any assumptions you make (e.g., "Assuming prerequisites met", "Typically offered in Fall only")

**CRITICAL: You MUST use the suggest_graduation_plan function to return your response. Respond ONLY with a valid JSON object using the function call. Do not include any text outside the JSON.**

**Example response format:**
{
  "summary_message": "I've created a personalized graduation plan for you! This plan includes 45 total courses with 12 already completed from your transcript. You're on track to graduate in Spring 2027.",
  "plan": [
    {
      "course_code": "MATH 101",
      "credits": 3,
      "term": "Fall 2023",
      "notes": "Completed",
      "is_completed": true
    },
    {
      "course_code": "CS 101",
      "credits": 4,
      "term": "Spring 2024",
      "notes": "Introduction to programming",
      "is_completed": false
    },
    {
      "course_code": "Apply to Program",
      "credits": 0,
      "term": "Fall 2024",
      "notes": "Apply to Computer Science major",
      "is_completed": false
    }
  ]
}`;
}

/**
 * OpenAI Function Calling tool definition for plan generation
 */
export const planGenerationToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'suggest_graduation_plan',
    description: 'Generate a complete semester-by-semester graduation plan based on the student\'s profile, transcript, program requirements, and course selections.',
    parameters: {
      type: 'object',
      properties: {
        summary_message: {
          type: 'string',
          description: 'A friendly 2-3 sentence message to the student about their graduation plan, highlighting key details like total courses, completion status, and any important notes.',
        },
        plan: {
          type: 'array',
          description: 'Complete graduation plan as a chronological list of courses and milestones',
          items: {
            type: 'object',
            properties: {
              course_code: {
                type: 'string',
                description: 'Course code or milestone name (e.g., "CS 101", "Apply to Program")',
              },
              credits: {
                type: 'number',
                description: 'Credit hours (0 for milestones)',
              },
              term: {
                type: 'string',
                description: 'Term in "Season Year" format (e.g., "Fall 2024")',
              },
              notes: {
                type: 'string',
                description: 'Notes, assumptions, or special instructions',
              },
              is_completed: {
                type: 'boolean',
                description: 'True if from transcript (already completed), false for future courses',
                default: false,
              },
            },
            required: ['course_code', 'credits', 'term'],
          },
        },
      },
      required: ['summary_message', 'plan'],
    },
  },
};

/**
 * Interface for the data needed to generate a plan
 */
export interface PlanGenerationData {
  // Profile data
  estGradDate: string | null;
  estGradSem: string | null;
  careerGoals: string | null;
  studentType: 'undergraduate' | 'graduate';

  // Transcript courses (already completed)
  transcriptCourses: Array<{
    course_code: string;
    title: string;
    credits: number;
    term_taken?: string;
    grade?: string;
  }>;

  // Program data
  programs: Array<{
    id: number;
    name: string;
    type: string;
    requirements?: unknown;
  }>;

  // Selected courses for requirements
  selectedCourses: Record<string, unknown>;

  // Additional concerns
  additionalConcerns: string | null;
}

/**
 * Builds the user prompt with all collected data
 */
export function buildPlanGenerationUserPrompt(data: PlanGenerationData): string {
  const sections: string[] = [];

  // Student Profile
  sections.push('=== STUDENT PROFILE ===');
  sections.push(`Student Type: ${data.studentType}`);
  if (data.estGradDate || data.estGradSem) {
    sections.push(`Expected Graduation: ${data.estGradSem || ''} ${data.estGradDate || ''}`.trim());
  }
  if (data.careerGoals) {
    sections.push(`Career Goals: ${data.careerGoals}`);
  }
  sections.push('');

  // Completed Courses (from transcript)
  if (data.transcriptCourses.length > 0) {
    sections.push('=== COMPLETED COURSES (FROM TRANSCRIPT) ===');
    sections.push('These courses are ALREADY COMPLETED and should be included in the plan with is_completed: true:');
    data.transcriptCourses.forEach(course => {
      const termInfo = course.term_taken ? ` (${course.term_taken})` : '';
      const gradeInfo = course.grade ? ` - Grade: ${course.grade}` : '';
      sections.push(`- ${course.course_code}: ${course.title} (${course.credits} credits)${termInfo}${gradeInfo}`);
    });
    sections.push('');
  }

  // Program Requirements
  if (data.programs.length > 0) {
    sections.push('=== ENROLLED PROGRAMS ===');
    data.programs.forEach(program => {
      sections.push(`${program.name} (${program.type})`);
      if (program.requirements) {
        sections.push(`Requirements: ${JSON.stringify(program.requirements, null, 2)}`);
      }
    });
    sections.push('');
  }

  // Selected Courses
  if (Object.keys(data.selectedCourses).length > 0) {
    sections.push('=== SELECTED COURSES FOR REQUIREMENTS ===');
    sections.push(JSON.stringify(data.selectedCourses, null, 2));
    sections.push('');
  }

  // Additional Concerns
  if (data.additionalConcerns) {
    sections.push('=== ADDITIONAL CONCERNS ===');
    sections.push(data.additionalConcerns);
    sections.push('');
  }

  sections.push('Please generate a complete graduation plan that includes all completed courses and schedules all remaining required courses to meet the graduation goal.');

  return sections.join('\n');
}

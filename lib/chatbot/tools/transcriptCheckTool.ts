/**
 * Transcript Check Tool for Graduation Plan Chatbot
 * Checks if user has uploaded a transcript and allows them to upload/update
 */

import { z } from 'zod';

// Input validation schema
export const TranscriptCheckSchema = z.object({
  hasTranscript: z.boolean(),
  wantsToUpload: z.boolean(),
  wantsToUpdate: z.boolean().optional(),
});

export type TranscriptCheckInput = z.infer<typeof TranscriptCheckSchema>;

// Tool result type
export interface TranscriptCheckResult {
  success: boolean;
  data?: {
    hasTranscript: boolean;
    wantsToUpload: boolean;
    wantsToUpdate?: boolean;
  };
  error?: string;
}

// OpenAI Function Calling schema
export const transcriptCheckToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'check_transcript_status',
    description: `Checks the student's transcript status and determines if they want to upload or update their transcript.
    Use this tool to:
    - Check if the user has already uploaded a transcript
    - Ask if they want to upload a transcript (if none exists)
    - Ask if they want to update their transcript (if one exists)

    The tool will present options based on their current transcript status.`,
    parameters: {
      type: 'object',
      properties: {
        hasTranscript: {
          type: 'boolean',
          description: 'Whether the user currently has a transcript uploaded',
        },
        wantsToUpload: {
          type: 'boolean',
          description: 'Whether the user wants to upload a new transcript',
        },
        wantsToUpdate: {
          type: 'boolean',
          description: 'Whether the user wants to update their existing transcript (only relevant if hasTranscript is true)',
        },
      },
      required: ['hasTranscript', 'wantsToUpload'],
    },
  },
};

/**
 * Determines transcript status messaging based on whether user has courses
 */
export function getTranscriptStatusMessage(hasCourses: boolean): {
  message: string;
  showUploadOption: boolean;
  showUpdateOption: boolean;
} {
  if (hasCourses) {
    return {
      message: 'I see you have courses on file. Would you like to update your transcript with any new courses?',
      showUploadOption: false,
      showUpdateOption: true,
    };
  }

  return {
    message: 'I don\'t see any courses on file yet. Would you like to upload your transcript? This will help me create a more accurate graduation plan.',
    showUploadOption: true,
    showUpdateOption: false,
  };
}

/**
 * Checks if user has uploaded courses
 */
export async function checkUserHasCourses(userId: string): Promise<boolean> {
  try {
    const { createSupabaseServerComponentClient } = await import('@/lib/supabase/server');
    const supabase = await createSupabaseServerComponentClient();

    const { data, error } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking user courses:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking user courses:', error);
    return false;
  }
}

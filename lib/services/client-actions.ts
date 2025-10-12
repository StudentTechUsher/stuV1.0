import { organizeCoursesIntoSemestersAction } from './server-actions';
import type { OrganizePromptInput } from '@/lib/validation/schemas';

// NOTE: This file has been intentionally slimmed down. Most program CRUD & data
// access helpers moved to programService/gradPlanService. Keep only the
// client-safe AI wrapper for now to avoid a large diff in the grad planner UI.
export async function OrganizeCoursesIntoSemesters(
  coursesData: unknown,
  promptInput: OrganizePromptInput
): Promise<{ success: boolean; message: string; semesterPlan?: unknown; accessId?: string }> {
  try {
    const result = await organizeCoursesIntoSemestersAction(coursesData, promptInput);
    return result;
  } catch (error) {
    console.error('Error in client wrapper OrganizeCoursesIntoSemesters:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate semester plan'
    };
  }
}

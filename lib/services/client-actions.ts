import { organizeCoursesIntoSemestersAction } from './server-actions';

// NOTE: This file has been intentionally slimmed down. Most program CRUD & data
// access helpers moved to programService/gradPlanService. Keep only the
// client-safe AI wrapper for now to avoid a large diff in the grad planner UI.
export async function OrganizeCoursesIntoSemesters(
    coursesData: unknown,
    prompt: string
): Promise<{ success: boolean; message: string; semesterPlan?: unknown; accessId?: string }> {
    try {
    const result = await organizeCoursesIntoSemestersAction(coursesData, prompt);
        return result;
    } catch (error) {
        console.error('❌ Error in client wrapper OrganizeCoursesIntoSemesters:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to generate semester plan'
        };
    }
}

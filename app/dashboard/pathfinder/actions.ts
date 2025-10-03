'use server';
import { GetMajorPivotCareerSuggestions_ServerAction, GetMajorsForCareerSelection_ServerAction, GetAdjacentCareerSuggestions_ServerAction, GetNearCompletionMinorAudit_ServerAction } from '@/lib/services/openaiService';
import { GetMinorsForUniversity } from '@/lib/services/programService';
import { createServerSupabase } from '@/lib/supabaseServer';

export async function fetchMajorPivotSuggestions(params: {
  currentMajor: string;
  form: { whyMajor: string; notWorking: string; partsLiked: string; wantCareerHelp: boolean; consideredCareer: string; };
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string; tags?: string[] }>;
  priorIds?: string[];
  reRequest?: boolean;
}) {
  return await GetMajorPivotCareerSuggestions_ServerAction(params);
}

export async function fetchMajorsForCareerSelection(args: {
  currentMajor: string;
  selectedCareerId: string;
  selectedCareerTitle: string;
  form: { whyMajor: string; notWorking: string; partsLiked: string; wantCareerHelp: boolean; consideredCareer: string; };
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string; tags?: string[] }>;
  universityId?: number;
}) {
  return await GetMajorsForCareerSelection_ServerAction({
    currentMajor: args.currentMajor,
    selectedCareerId: args.selectedCareerId,
    selectedCareerTitle: args.selectedCareerTitle,
    form: args.form,
    completedCourses: args.completedCourses || [],
    universityId: args.universityId,
  });
}

export async function fetchAdjacentCareerSuggestions(args: {
  currentMajor: string;
  whyLikeMajor: string;
  targetIndustry: string;
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string; tags?: string[] }>;
}) {
  return await GetAdjacentCareerSuggestions_ServerAction(args);
}

export async function fetchNearCompletionMinorAudit(args: {
  currentMajor?: string;
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string }>;
  minors: Array<{ id: number | string; name: string; requirements: unknown }>;
}) {
  return await GetNearCompletionMinorAudit_ServerAction(args);
}

// Fetch catalog of minors for a given university (id, name, requirements only)
export async function fetchMinorsCatalog(universityId: number) {
  const rows = await GetMinorsForUniversity(universityId);
  return rows.map(r => ({ id: r.id, name: r.name, requirements: r.requirements }));
}

// Persist targeted career selection for the current authenticated student
export async function saveTargetedCareer(careerTitle: string) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: 'Not authenticated' };
    }
    // Assuming a student table with a row keyed by profile/user id (adjust as needed)
    const { error: updateError } = await supabase
      .from('student')
      .update({ targeted_career: careerTitle })
      .eq('profile_id', user.id);
    if (updateError) {
      return { success: false, message: updateError.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Unknown error' };
  }
}

import { supabase } from "../supabase";
import { encodeAccessId } from "../utils/access-id";

/**
 * AUTHORIZED FOR ANONYMOUS USERS AND ABOVE (depending on use case)
 * Fetches an AI prompt by its name
 * @param prompt_name
 * @return
 **/
export async function GetAiPrompt(prompt_name: string) {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('prompt_name', prompt_name)
    .single();

  if (error) {
    console.error('❌ Error fetching AI prompt:', error);
    return null;
  }

  return data?.prompt || null;
}

/**
 * AUTHORIZED FOR STUDENTS AND ABOVE
 * Inserts a newly generated AI graduation plan into the grad_plan table.
 * Returns { gradPlanId, accessId } or throws on fatal errors.
 */
export async function InsertGeneratedGradPlan(args: {
  studentId: number;
  planData: unknown; // structured plan object or array
  rawJsonText?: string; // optional raw JSON text if you still want to retain
  programsInPlan?: number[]; // optional associated program IDs
  isActive?: boolean; // default false for newly generated pending plan
}): Promise<{ gradPlanId: number; accessId: string }> {
  const { studentId, planData, programsInPlan = [], isActive = false } = args;

  const { data, error } = await supabase
    .from('grad_plan')
    .insert({
      student_id: studentId,
      is_active: isActive,
      pending_edits: false,
      pending_approval: true,
      plan_details: planData, // store structured object/array directly
      programs_in_plan: programsInPlan
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('⚠️ Error inserting generated grad plan:', error);
    throw new Error('Failed to store generated graduation plan');
  }

  return { gradPlanId: data.id, accessId: encodeAccessId(data.id) };
}
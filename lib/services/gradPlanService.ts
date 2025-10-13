import { supabase } from "../supabase";
import { encodeAccessId } from "../utils/access-id";

// ---- Error Types ----
export class GradPlanNotFoundError extends Error {
    constructor(message = 'Graduation plan not found') { super(message); this.name = 'GradPlanNotFoundError'; }
}
export class GradPlanFetchError extends Error {
    constructor(message: string, public cause?: unknown) { super(message); this.name = 'GradPlanFetchError'; }
}

/**
 * AUTHORIZED FOR STUDENTS AND ABOVE
 * Fetches all graduation plans produced by a user
 * @param profile_id - the unique id of the user's profile
 * @returns 
 */
export async function GetAllGradPlans(profile_id: string) {
  
  // First, get the student record to get the numeric student_id
  const { data: studentData, error: studentError } = await supabase
    .from('student')
    .select('id')
    .eq('profile_id', profile_id)
    .single();

  if (studentError) {
    // PGRST116 means no rows returned - this is normal for new users
    if (studentError.code === 'PGRST116') {
      return [];
    }
    console.error('❌ Error fetching student record:', studentError);
    return [];
  }

  if (!studentData) {
    return [];
  }

  // Get all grad plans for this student, ordered by creation date (newest first)
  const { data, error } = await supabase
    .from('grad_plan')
    .select('*')
    .eq('student_id', studentData.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching all grad plans:', error);
    return [];
  }

  return data || [];
}

/**
 * AUTHORIZED FOR STUDENTS AND ABOVE
 * Fetches the active graduation plan for a user
 * @param profile_id 
 * @returns 
 */
export async function GetActiveGradPlan(profile_id: string) {
  
  // First, get the student record to get the numeric student_id
  const { data: studentData, error: studentError } = await supabase
    .from('student')
    .select('id')
    .eq('profile_id', profile_id)
    .single();

  if (studentError) {
    // PGRST116 means no rows returned - this is normal for new users
    if (studentError.code === 'PGRST116') {
      return null;
    }
    console.error('❌ Error fetching student record:', studentError);
    return null;
  }

  if (!studentData) {
    return null;
  }

  // Now get the active grad plan using the numeric student_id
  const { data, error } = await supabase
    .from('grad_plan')
    .select('*')
    .eq('student_id', studentData.id)
    .eq('is_active', true)
    .single();

  if (error) {
    // PGRST116 means no rows returned - this is normal for users without grad plans
    if (error.code === 'PGRST116') {
      console.log('ℹ️ No active graduation plan found for student_id:', studentData.id, '(normal for new users)');
      return null;
    }
    console.error('❌ Error fetching active grad plan:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
  console.log('✅ Active graduation plan found for student_id:', studentData.id);
  return data;
}

/**
 * AUTHORIZED FOR ADVISORS AND STUDENTS
 * Fetches a graduation plan by ID for editing purposes.
 * This does not filter by pending_approval, allowing advisors and students to edit any plan.
 * Returns null if not found.
 */
export async function fetchGradPlanForEditing(gradPlanId: string): Promise<{
    id: string;
    student_first_name: string;
    student_last_name: string;
    created_at: string;
    plan_details: unknown;
    student_id: number;
    programs: Array<{ id: number; name: string }>;
    est_grad_sem?: string;
    est_grad_date?: string;
    advisor_notes: string | null;
    plan_name: string | null;
}> {
    try {
        // 1. Base grad plan (no pending_approval filter so advisors/students can edit)
        const { data: gradPlanData, error: gradPlanError } = await supabase
            .from('grad_plan')
            .select('id, created_at, student_id, plan_details, programs_in_plan, advisor_notes, plan_name')
            .eq('id', gradPlanId)
            .single();

        if (gradPlanError) {
            if (gradPlanError.code === 'PGRST116') { // row not found
                throw new GradPlanNotFoundError();
            }
            console.error('❌ Error fetching grad plan for editing:', gradPlanError);
            throw new GradPlanFetchError('Failed to fetch graduation plan', gradPlanError);
        }
        if (!gradPlanData) {
            throw new GradPlanNotFoundError();
        }

        // 2. Student row (profile id)
        const { data: studentData, error: studentError } = await supabase
            .from('student')
            .select('profile_id')
            .eq('id', gradPlanData.student_id)
            .single();
        if (studentError) {
            console.error('❌ Error fetching student record:', studentError);
            throw new GradPlanFetchError('Failed to fetch related student record', studentError);
        }

        // 3. Profile names and graduation timeline
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('fname, lname, est_grad_sem, est_grad_date')
            .eq('id', studentData.profile_id)
            .single();
        if (profileError) {
            console.error('❌ Error fetching profile data:', profileError);
            throw new GradPlanFetchError('Failed to fetch profile data', profileError);
        }

        // 4. Program details
        let programs: Array<{ id: number; name: string }> = [];
        if (Array.isArray(gradPlanData.programs_in_plan) && gradPlanData.programs_in_plan.length > 0) {
            const { data: programsData, error: programsError } = await supabase
                .from('program')
                .select('id, name')
                .in('id', gradPlanData.programs_in_plan);
            if (programsError) {
                console.error('❌ Error fetching programs:', programsError);
                throw new GradPlanFetchError('Failed to fetch associated programs', programsError);
            }
            programs = programsData || [];
        }

        return {
            id: gradPlanData.id,
            student_first_name: profileData.fname,
            student_last_name: profileData.lname,
            created_at: gradPlanData.created_at,
            plan_details: gradPlanData.plan_details,
            student_id: gradPlanData.student_id,
            programs,
            est_grad_sem: profileData.est_grad_sem,
            est_grad_date: profileData.est_grad_date,
            advisor_notes: gradPlanData.advisor_notes || null,
            plan_name: gradPlanData.plan_name ?? null
        };
    } catch (err) {
        // Pass through known structured errors; wrap unknowns
        if (err instanceof GradPlanNotFoundError || err instanceof GradPlanFetchError) {
            throw err;
        }
        console.error('❌ Unexpected error in fetchGradPlanForEditing:', err);
        throw new GradPlanFetchError('Unexpected error fetching graduation plan', err);
    }
}

/**
 * Available to students and above
 * @param gradPlanId
 * @returns 
 */
export async function fetchGradPlanById(gradPlanId: string): Promise<{
    id: string;
    student_first_name: string;
    student_last_name: string;
    created_at: string;
    plan_details: unknown;
    student_id: number;
    programs: Array<{ id: number; name: string }>;
} | null> {
    // First, get the grad plan
    const { data: gradPlanData, error: gradPlanError } = await supabase
        .from('grad_plan')
        .select('id, created_at, student_id, plan_details, programs_in_plan')
        .eq('id', gradPlanId)
        .eq('pending_approval', true)
        .single();

    if (gradPlanError) {
        console.error('❌ Error fetching grad plan:', gradPlanError);
        throw gradPlanError;
    }

    if (!gradPlanData) {
        return null;
    }

    // Get the student's profile_id
    const { data: studentData, error: studentError } = await supabase
        .from('student')
        .select('profile_id')
        .eq('id', gradPlanData.student_id)
        .single();

    if (studentError) {
        console.error('❌ Error fetching student record:', studentError);
        throw studentError;
    }

    // Get the profile data
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('fname, lname')
        .eq('id', studentData.profile_id)
        .single();

    if (profileError) {
        console.error('❌ Error fetching profile record:', profileError);
        throw profileError;
    }

    // Get program names if programs_in_plan exists and is not empty
    let programs: Array<{ id: number; name: string }> = [];
    if (gradPlanData.programs_in_plan && Array.isArray(gradPlanData.programs_in_plan) && gradPlanData.programs_in_plan.length > 0) {
        const { data: programsData, error: programsError } = await supabase
            .from('program')
            .select('id, name')
            .in('id', gradPlanData.programs_in_plan);

        if (programsError) {
            console.error('❌ Error fetching program data:', programsError);
            // Don't throw error, just log it and continue with empty array
        } else {
            programs = programsData || [];
        }
    }

    return {
        id: gradPlanData.id,
        student_first_name: profileData.fname || 'Unknown',
        student_last_name: profileData.lname || 'Unknown',
        created_at: gradPlanData.created_at,
        plan_details: gradPlanData.plan_details,
        student_id: gradPlanData.student_id,
        programs: programs
    };
}

/** AUTHORIZED FOR ADVISORS ONLY (for now)
 * Fetches all graduation plans that are pending approval
 * Returns an array of plans with student names flattened for easier display
 */
export async function fetchPendingGradPlans(): Promise<Array<{
    id: string;
    student_first_name: string;
    student_last_name: string;
    created_at: string;
    student_id: number;
  }>> {
      // First, get all grad plans where pending_approval = true
      const { data: gradPlansData, error: gradPlansError } = await supabase
          .from('grad_plan')
          .select('id, created_at, student_id')
          .eq('pending_approval', true)
          .order('created_at', { ascending: false });

      if (gradPlansError) {
          console.error('❌ Error fetching pending graduation plans:', gradPlansError);
          throw gradPlansError;
      }

      if (!gradPlansData || gradPlansData.length === 0) {
          return [];
      }

      // Get unique student_ids
      const studentIds = [...new Set(gradPlansData.map(plan => plan.student_id))];

      // Get profile_ids for these students
      const { data: studentsData, error: studentsError } = await supabase
          .from('student')
          .select('id, profile_id')
          .in('id', studentIds);

      if (studentsError) {
          console.error('❌ Error fetching student records:', studentsError);
          throw studentsError;
      }

      if (!studentsData || studentsData.length === 0) {
          console.warn('⚠️ No student records found for grad plans');
          return gradPlansData.map(plan => ({
              id: plan.id,
              student_first_name: 'Unknown',
              student_last_name: 'Unknown',
              created_at: plan.created_at,
              student_id: plan.student_id
          }));
      }

      // Get unique profile_ids
      const profileIds = [...new Set(studentsData.map(student => student.profile_id))];

      // Get profile data (fname, lname)
      const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, fname, lname')
          .in('id', profileIds);

      if (profilesError) {
          console.error('❌ Error fetching profile records:', profilesError);
          throw profilesError;
      }

      // Create maps for efficient lookup
      const studentMap = new Map(studentsData.map(student => [student.id, student.profile_id]));
      const profileMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

      // Transform the data to flatten the nested structure
      return gradPlansData.map(plan => {
          const profileId = studentMap.get(plan.student_id);
          const profile = profileId ? profileMap.get(profileId) : null;

          return {
              id: plan.id,
              student_first_name: profile?.fname || 'Unknown',
              student_last_name: profile?.lname || 'Unknown',
              created_at: plan.created_at,
              student_id: plan.student_id
          };
      });
}

/**
 * AUTHORIZED FOR ADVISORS ONLY
 * Updates a graduation plan with advisor notes and sets status for pending edits
 * Sets pending_edits: true and pending_approval: false to indicate student needs to review suggestions
 */
export async function updateGradPlanWithAdvisorNotes(
    gradPlanId: string,
    advisorNotes: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update the graduation plan with advisor notes
        const { error } = await supabase
            .from('grad_plan')
            .update({ 
                advisor_notes: advisorNotes, 
                pending_edits: true,
                pending_approval: false 
            })
            .eq('id', gradPlanId);

        if (error) {
            console.error('❌ Error updating grad plan with advisor notes:', error);
            return { success: false, error: error.message };
        }

        return { success: true };

    } catch (error) {
        console.error('❌ Unexpected error updating grad plan:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
    }
}

/**
 * AUTHORIZED FOR ADVISORS ONLY
 * Approves a graduation plan by setting it as active and deactivating any previous active plans
 * Sets pending_approval: false, is_active: true, and deactivates other plans for the same student
 */
export async function approveGradPlan(
    gradPlanId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('✅ Approving grad plan:', { gradPlanId });

        // First, get the grad plan to find the student_id
        const { data: gradPlanData, error: gradPlanError } = await supabase
            .from('grad_plan')
            .select('student_id')
            .eq('id', gradPlanId)
            .single();

        if (gradPlanError) {
            console.error('❌ Error fetching grad plan for approval:', gradPlanError);
            return { success: false, error: gradPlanError.message };
        }

        if (!gradPlanData) {
            return { success: false, error: 'Graduation plan not found' };
        }

        const studentId = gradPlanData.student_id;

        // Start a transaction-like operation
        // First, set all existing active plans for this student to inactive
        const { error: deactivateError } = await supabase
            .from('grad_plan')
            .update({ is_active: false })
            .eq('student_id', studentId)
            .eq('is_active', true);

        if (deactivateError) {
            console.error('❌ Error deactivating previous plans:', deactivateError);
            return { success: false, error: deactivateError.message };
        }

        // Now set the approved plan as active and not pending approval
        const { error: approvalError } = await supabase
            .from('grad_plan')
            .update({ 
                is_active: true,
                pending_approval: false,
                pending_edits: false // Clear any pending edits since plan is now approved
            })
            .eq('id', gradPlanId);

        if (approvalError) {
            console.error('❌ Error approving grad plan:', approvalError);
            return { success: false, error: approvalError.message };
        }

        console.log('✅ Grad plan approved successfully:', { gradPlanId, studentId });
        return { success: true };

    } catch (error) {
        console.error('❌ Unexpected error approving grad plan:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error occurred' 
        };
    }
}

/** AUTHORIZED FOR STUDENTS ONLY
 * Sets pending_approval to true and is_active to false
 * TODO: Check for possible duplication
 */
export async function submitGradPlanForApproval(
    profileId: string,
    planDetails: unknown,
    programIds: number[],
    planName?: string
): Promise<{ success: boolean; message?: string; accessId?: string }> {
    try {
        // First, get the student_id (number) from the students table using the profile_id (UUID)
        const { data: studentData, error: studentError } = await supabase
            .from('student')
            .select('id')
            .eq('profile_id', profileId)
            .single();

        if (studentError || !studentData?.id) {
            console.error('Error fetching student_id from students table:', studentError);
            throw new Error('Could not find student record');
        }

        const { data, error } = await supabase
            .from('grad_plan')
            .insert({
                student_id: studentData.id,
                is_active: false,
                plan_details: planDetails,
                programs_in_plan: programIds,
                pending_approval: true,
                plan_name: planName?.trim() ? planName.trim() : null,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error submitting graduation plan for approval:', {
                error: error,
                errorMessage: error.message,
                errorDetails: error.details,
                errorHint: error.hint,
                errorCode: error.code,
            });
            throw error;
        }

        // Encode the grad plan ID to generate the accessId
        const accessId = encodeAccessId(data.id);

        return { success: true, accessId };
    } catch (error) {
        console.error('Caught error in submitGradPlanForApproval:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return {
            success: false,
            message: 'Failed to submit graduation plan for approval. Please try again.'
        };
    }
}

/** AUTHORIZED FOR ADVISORS ONLY (non-approval save)
 * Updates only plan_details for an existing grad plan. Does NOT modify approval / active flags.
 */
export async function updateGradPlanDetails(
    gradPlanId: string,
    planDetails: unknown
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('grad_plan')
            .update({ plan_details: planDetails })
            .eq('id', gradPlanId);
        if (error) {
            console.error('❌ Error updating plan_details:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        console.error('❌ Unexpected error updating plan_details:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/** AUTHORIZED FOR ADVISORS ONLY
 * Atomically update plan_details and advisor_notes and transition to pending_edits state (removes from pending_approval).
 */
export async function updateGradPlanDetailsAndAdvisorNotes(
    gradPlanId: string,
    planDetails: unknown,
    advisorNotes: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('grad_plan')
            .update({ 
                plan_details: planDetails,
                advisor_notes: advisorNotes,
                pending_edits: true,
                pending_approval: false
            })
            .eq('id', gradPlanId);
        if (error) {
            console.error('❌ Error updating plan & notes:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        console.error('❌ Unexpected error updating plan & notes:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/** Updates the plan_name for a graduation plan */
export async function updateGradPlanName(
    gradPlanId: string,
    planName: string
): Promise<{ success: boolean; error?: string }> {
    const trimmedName = planName.trim();
    if (!trimmedName) {
        return { success: false, error: 'Plan name is required' };
    }
    try {
        const { error } = await supabase
            .from('grad_plan')
            .update({ plan_name: trimmedName })
            .eq('id', gradPlanId);
        if (error) {
            console.error('�?O Error updating plan_name:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        console.error('�?O Unexpected error updating plan_name:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

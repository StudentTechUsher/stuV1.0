'use server';

import { getVerifiedUser } from '../supabase/auth';
import { supabase } from '../supabase';
import type { ProgramRow } from '@/types/program';
import fs from 'fs';
import path from 'path';
import { encodeAccessId } from '@/lib/utils/access-id';

// Secure server action that handles OpenAI API calls and user authentication
export async function OrganizeCoursesIntoSemesters_ServerAction(
  coursesData: unknown,
): Promise<{ success: boolean; message: string; semesterPlan?: unknown }> {
  const start = Date.now();
  const t = (label: string, since?: number) => {
    const now = Date.now();
    const ms = since ? now - since : now - start;
    console.log(`⏱️ ${label}: ${ms}ms`);
    return now;
  };
  const trunc = (s: string, n = 1200) => (s.length > n ? `${s.slice(0, n)}…[+${s.length - n}]` : s);

  console.log("🔍 OrganizeCoursesIntoSemesters_ServerAction called with (preview):",
    (() => {
      try { return trunc(JSON.stringify(coursesData ?? null)); } catch { return "[unserializable]"; }
    })(),
  );

  try {
    // Get the current user from session
    let t0 = t("start");
    const user = await getVerifiedUser();
    t0 = t("getVerifiedUser", t0);
    if (!user) {
      console.error("❌ Auth error: user not authenticated");
      throw new Error("User not authenticated");
    }
    console.log("👤 user.id:", user.id);

    // Validate OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ Config error: OPENAI_API_KEY missing");
      throw new Error("OpenAI API key not configured");
    } else {
      console.log("🔐 OPENAI_API_KEY present (preview):", `${apiKey.slice(0, 2)}***${apiKey.slice(-2)}`);
    }

    // Load example structure from external JSON file
    let exampleStructure;
    try {
      const examplePath = path.join(process.cwd(), "config", "prompts", "semester-plan-example.json");
      console.log("📄 Loading example structure from:", examplePath);
      const tRead = Date.now();
      const exampleContent = fs.readFileSync(examplePath, "utf8");
      console.log("📄 Example file read OK in", Date.now() - tRead, "ms | size:", exampleContent.length);
      exampleStructure = JSON.parse(exampleContent);
      console.log("✅ Example JSON parsed (preview):", trunc(JSON.stringify(exampleStructure)));
    } catch (error) {
      console.error("❌ Failed to load example structure:", error);
      throw new Error("Failed to load example structure");
    }

    // Prepare the prompt for OpenAI
    const prompt = `
    You are an academic advisor AI. Given the selected programs and general-education requirements, produce an 8-semester plan.

    Goals
    - Create a term-by-term plan that balances workload and sequencing.
    - Use only data provided in the input; do not invent courses.
    - Use a "General Elective" placeholder to reach credit targets without overloading any single term.

    Hard constraints (must follow)
    - Catalog scope: Use only courses present in the input's "programs" and "generalEducation" sections.
      - The only allowed placeholder is:
        { "code": "ELECTIVE", "title": "General Elective", "credits": X, "fulfills": ["Elective"] }.
    - Credit load per term: 12–18 credits.
    - Total credits: Use input "target_total_credits" if provided; otherwise default to 120.
      - If below target after scheduling requirements, add "ELECTIVE" items with appropriate credits to reach the target while respecting 12–18 credits/term.
    - No duplicates: A course code may appear at most once in the entire plan.
    - Fulfillment tagging:
      - For general education, use the exact bucket names from the input (use the provided strings verbatim).
      - For program requirements, use the exact requirement keys from the input (e.g., "requirement-2", "subrequirement-1.1"). Do not invent labels.
      - For the elective placeholder, use ["Elective"] as the fulfills list.
    - Sequencing and prerequisites:
      - Respect textual prerequisites in the input. Do not place a course before its prerequisites are planned in an earlier term.
      - If a course or requirement mentions program admission (e.g., "Acceptance into the program", "Junior Core"), schedule an "Apply/Admission" checkpoint before those courses and place such courses only in terms after that checkpoint.
    - Distribution of requirements:
      - Spread general education across the first four terms when possible; avoid front-loading or back-loading.
      - Do not schedule a term composed only of "ELECTIVE" placeholders if unmet non-elective requirements remain.
      - Limit "ELECTIVE" credit per term to a reasonable amount (typically 3–6) unless needed to achieve 12–18 credits or to meet the total-credit target.

    Planning heuristics (should follow)
    - Aim for 14–16 credits per term when feasible.
    - Prefer pairing small-credit courses together to reduce underloaded terms.
    - If multiple programs are selected, interleave their requirements and avoid conflicts; count a course once even if it satisfies multiple buckets, and reflect that in "fulfills".

    Output format
    Return ONLY JSON in this exact schema (no extra text):

    Example format:
    ${JSON.stringify(exampleStructure, null, 2)}
    
    Input data:
    ${JSON.stringify(coursesData, null, 2)}
    `;

    const payload = {
      model: "gpt-5-mini",
      input: prompt,
      text: { format: { type: "json_object" } }, // 👈 object, not "json_object" string
      max_output_tokens: 25000,
    };
    console.log("📦 OpenAI payload (preview):", { model: payload.model, max_output_tokens: payload.max_output_tokens });

    // Call OpenAI
    let resp: Response;
    const tOpenAI = Date.now();
    try {
      resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      console.error("🌐 Network error calling OpenAI:", networkErr);
      throw new Error("Failed to reach OpenAI");
    }
    const openAiMs = Date.now() - tOpenAI;
    const reqId = resp.headers.get("x-request-id") || resp.headers.get("request-id");
    console.log("📡 OpenAI responded in", openAiMs, "ms | status:", resp.status, "| request-id:", reqId);

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("❌ OpenAI HTTP error:", { status: resp.status, requestId: reqId, bodyPreview: trunc(errBody) });
      throw new Error(`OpenAI error ${resp.status}`);
    }

    type ResponsesApiResult = {
      status?: string; // "completed" | "incomplete" | ...
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: { value?: string } | null }>;
      }>;
      incomplete_details?: { reason?: string };
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    let aiResponse: ResponsesApiResult;
    try {
      aiResponse = (await resp.json()) as ResponsesApiResult;
      console.log("🤖 OpenAI JSON parsed (preview):", trunc(JSON.stringify(aiResponse)));
    } catch (parseErr) {
      console.error("❌ Failed to parse OpenAI JSON:", parseErr);
      throw new Error("Unable to parse OpenAI response");
    }

    // Preferred: concatenated text
    let aiText = aiResponse.output_text;

    // Fallback: stitch any text parts (supports both string and { value } shapes)
    type ContentType = { type?: string; text?: string | { value?: string } | null };
    if (!aiText && Array.isArray(aiResponse.output)) {
      aiText = aiResponse.output
        .flatMap(p => p?.content ?? [])
        .map((c: ContentType) => {
          if (!c) return "";
          if (typeof c.text === "string") return c.text.trim();
          const v = (c.text as { value?: string })?.value;
          return typeof v === "string" ? v.trim() : "";
        })
        .filter(Boolean)
        .join("\n");
    }

    console.log("🧩 aiResponse.status:", aiResponse.status, "| aiText present:", Boolean(aiText));
    if ((aiResponse.status && aiResponse.status !== "completed") || !aiText) {
      const reason = aiResponse.incomplete_details?.reason ?? "unknown";
      console.error("❌ Incomplete/empty AI response:", { status: aiResponse.status, reason, requestId: reqId });
      throw new Error(
        aiText
          ? `Run incomplete: ${aiResponse.status} (${reason})`
          : `No content received from OpenAI (status=${aiResponse.status ?? "unknown"}, reason=${reason})`,
      );
    }

    // Parse JSON (we asked for JSON mode)
    let semesterPlan: unknown;
    try {
      console.log("🧪 Attempting to parse AI text (preview):", trunc(aiText));
      semesterPlan = JSON.parse(aiText);
      console.log("✅ Parsed semesterPlan (preview):", trunc(JSON.stringify(semesterPlan)));
    } catch (e) {
      console.error("❌ Error parsing AI response as JSON:", e, "| raw preview:", trunc(aiText));
      throw new Error("Invalid JSON response from AI");
    }

    // Store the raw JSON string
    try {
      const tStore = Date.now();
      const outputTokens = aiResponse.usage?.completion_tokens || 0; // Default to 0 instead of null
      const { error: insertError } = await supabase.from("ai_responses").insert({ 
        user_id: user.id, 
        response: aiText,
        user_prompt: prompt,
        output_tokens: outputTokens
      });
      const storeMs = Date.now() - tStore;
      if (insertError) {
        console.error("⚠️ Error storing AI response:", insertError, "| took:", storeMs, "ms");
      } else {
        console.log("💾 AI response stored successfully for user:", user.id, "| output_tokens:", outputTokens, "| took:", storeMs, "ms");
      }
    } catch (storageError) {
      console.error("⚠️ Exception storing AI response:", storageError);
    }

    // Insert the AI response into the grad_plan table
    const { data: gradPlanData, error: gradPlanError } = await supabase.from("grad_plan").insert({
      student_id: user.id, // Assuming user.id corresponds to the student_id
      is_active: false,
      pending_edits: false,
      pending_approval: true,
      plan_details: aiText, // Use the AI response as the plan details
      programs_in_plan: [] // Assuming no programs are associated initially
    }).select("id").single();

    if (gradPlanError) {
      console.error("⚠️ Error inserting into grad_plan table:", gradPlanError);
    } else {
      console.log("✅ AI response also stored in grad_plan table with ID:", gradPlanData.id);

      // Generate accessId for the new grad plan
      const accessId = encodeAccessId(gradPlanData.id);
      console.log("🔑 Generated accessId:", accessId);
    }

    console.log("🏁 Success; total time:", Date.now() - start, "ms");
    return {
      success: true,
      message: "Semester plan generated successfully!",
      semesterPlan,
    };
  } catch (error) {
    console.error("🛑 Error generating semester plan:", error instanceof Error ? error.message : error, error);
    return {
      success: false,
      // Bubble the specific error message to help you debug locally (adjust if you prefer generic)
      message: `Failed to generate semester plan: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Server-only functions that need to be called from server components
export default async function GetProgramsForUniversity(university_id: number) {
    
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', false);

    if (error) {
      console.error('❌ Error fetching programs:', error);
      return [];
    }

    return data || [];
}

export async function GetGenEdsForUniversity(university_id: number) {
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', true);

    if (error) {
      console.error('❌ Error fetching general education programs:', error);
      return [];
    }

    return data || [];
}

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
      console.log('ℹ️ No student record found for profile_id:', profile_id, '(new user)');
      return null;
    }
    console.error('❌ Error fetching student record:', studentError);
    return null;
  }

  if (!studentData) {
    console.log('ℹ️ No student data returned for profile_id:', profile_id);
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

export async function GetAiPrompt(prompt_name: string) {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('prompt')
    .eq('prompt_name', prompt_name)
    .single();

  if (error) {
    console.error('❌ Error fetching AI prompt:', error);
    return null;
  }

  return data?.prompt || null;
}

export async function submitGradPlanForApproval(
    profileId: string,
    planDetails: unknown,
    programIds: number[]
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

export async function fetchProgramsByUniversity(universityId: number): Promise<ProgramRow[]> {
    const { data, error } = await supabase
    .from('program')
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ProgramRow[];
}

export async function deleteProgram(id: string): Promise<void> {
    const { error } = await supabase
        .from('program')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

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

/**
 * Updates a graduation plan with advisor notes and sets status for pending edits
 * Sets pending_edits: true and pending_approval: false to indicate student needs to review suggestions
 */
export async function updateGradPlanWithAdvisorNotes(
    gradPlanId: string,
    advisorNotes: string
): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('📝 Updating grad plan with advisor notes and setting pending_edits=true:', { gradPlanId, notesLength: advisorNotes.length });

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

export async function fetchGradPlanForEditing(gradPlanId: string): Promise<{
    id: string;
    student_first_name: string;
    student_last_name: string;
    created_at: string;
    plan_details: unknown;
    student_id: number;
    programs: Array<{ id: number; name: string }>;
} | null> {
    // Get the grad plan without filtering by pending_approval (for editing interface)
    const { data: gradPlanData, error: gradPlanError } = await supabase
        .from('grad_plan')
        .select('id, created_at, student_id, plan_details, programs_in_plan')
        .eq('id', gradPlanId)
        .single();

    if (gradPlanError) {
        console.error('❌ Error fetching grad plan for editing:', gradPlanError);
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
        console.error('❌ Error fetching profile data:', profileError);
        throw profileError;
    }

    // Get program details
    let programs: Array<{ id: number; name: string }> = [];
    if (gradPlanData.programs_in_plan && Array.isArray(gradPlanData.programs_in_plan)) {
        const { data: programsData, error: programsError } = await supabase
            .from('program')
            .select('id, name')
            .in('id', gradPlanData.programs_in_plan);

        if (programsError) {
            console.error('❌ Error fetching programs:', programsError);
            throw programsError;
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
        programs
    };
}

'use server';

import { getVerifiedUser } from '../supabase/auth';
import { supabase } from '../supabase';
import type { ProgramRow } from '@/types/program';
import fs from 'fs';
import path from 'path';

// Secure server action that handles OpenAI API calls and user authentication
export async function OrganizeCoursesIntoSemesters_ServerAction(
  coursesData: unknown,
): Promise<{ success: boolean; message: string; semesterPlan?: unknown }> {
  const start = Date.now();
  const t = (_label: string, _since?: number) => {
    const now = Date.now();
    return now;
  };
  const trunc = (s: string, n = 1200) => (s.length > n ? `${s.slice(0, n)}…[+${s.length - n}]` : s);

  try {
    // Get the current user from session
    t("start");
    const user = await getVerifiedUser();
    t("getVerifiedUser");
    if (!user) {
      console.error("❌ Auth error: user not authenticated");
      throw new Error("User not authenticated");
    }

    // Validate OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ Config error: OPENAI_API_KEY missing");
      throw new Error("OpenAI API key not configured");
    }

    // Load example structure from external JSON file
    let exampleStructure;
    try {
      const examplePath = path.join(process.cwd(), "config", "prompts", "example-format-byu-2024.json");
      const exampleContent = fs.readFileSync(examplePath, "utf8");
      exampleStructure = JSON.parse(exampleContent);
    } catch (error) {
      console.error("Failed to load example structure:", error);
      throw new Error("Failed to load example-format-byu-2024.json");
    }

    // Prepare the prompt for OpenAI
    const prompt = `
    You are an academic advisor AI. Given the selected programs, general-education requirements, and (optionally) a list of courses the student has already taken, produce a term-by-term plan.

Goals
- Create a term-by-term plan that balances workload and sequencing.
- The number of future terms is flexible; use as many or as few as needed to meet program requirements.
- Prioritize making sure each planned (future) term has at least 12 credits (minimum full-time load).
- Use only data provided in the input; do not invent courses.
- Select real elective courses from the catalog to reach credit targets. Only use "General Elective" placeholder if absolutely no valid catalog courses remain.

NEW: Previously taken coursework (must handle if provided)
- Input may include \`takenCourses\` (or similarly named list) with items that can contain fields like: \`code\`, \`title\`, \`credits\`, \`term\`, \`year\`, \`grade\`, \`source\` (e.g., Transfer/AP/Institutional), \`fulfills\` (buckets/requirements), and \`status\` (e.g., Completed/In-Progress).
- Treat courses in \`takenCourses\` as already completed (or in-progress if explicitly marked).
  - Do NOT schedule a course again if it appears in \`takenCourses\` with a passing grade or status Completed.
  - If a minimum grade is required (as stated in the catalog text) and the taken grade is below the minimum, the course must be planned as a retake.
  - If a course is marked In-Progress for the current/most recent term, count it as occupying that term; do not reschedule it in future terms.
- Place all \`takenCourses\` at the beginning of the returned plan in their original terms (historical terms), before any planned future terms.
  - These historical terms are part of the output so the full journey is visible, but you must NOT change their contents.
  - Credits from historical terms count toward the target total and toward requirement/bucket fulfillment.
- Apply fulfillment: any requirements/general-education buckets satisfied by \`takenCourses\` must be marked as fulfilled; do not plan them again.
- Prerequisites: courses in \`takenCourses\` with passing grades satisfy prerequisites for later planned courses.

Hard constraints (must follow)
- Catalog scope: Use only courses present in the input's \`programs\` and \`generalEducation\` sections.
  - The only allowed placeholder is:
    { "code": "ELECTIVE", "title": "General Elective", "credits": X, "fulfills": ["Elective"] }.
  - X must be between 1–4 credits (typical course size).
  - Before using a placeholder, attempt to select real courses from the catalog that:
    * Are not already in the plan or in \`takenCourses\` (no duplicates)
    * Have prerequisites satisfied by prior (historical or earlier planned) terms
    * Fit within the term's 12–18 credit limit
  - Prefer courses from the student's program area or related subjects when available.
- Credit load per planned term: 12–18 credits.
- Total credits: Use input \`target_total_credits\` if provided; otherwise default to 120.
  - First, count credits from \`takenCourses\` and any In-Progress terms toward the total.
  - If below target after scheduling requirements, add real elective courses first; use "ELECTIVE" placeholder only if catalog is exhausted.
- No duplicates: A course code may appear at most once across \`takenCourses\` and planned future terms, unless a retake is required due to grade/minimum-grade policy explicitly stated in input text.
- Elective selection priority (AUTO mode):
  1. Check if the input includes a course catalog or list of available electives
  2. Select real courses (not placeholders) that fit prerequisites and term load
  3. Favor upper-level courses (300+) when filling later terms
  4. Only use { "code": "ELECTIVE", "title": "General Elective", "credits": 1–4 } if catalog is exhausted
  5. Never create ELECTIVE entries with credits > 4
- Fulfillment tagging:
  - For general education, use the exact bucket names from the input (use the provided strings verbatim).
  - For program requirements, use the exact requirement keys from the input (e.g., "requirement-2", "subrequirement-1.1"). Do not invent labels.
  - For the elective placeholder, use ["Elective"] as the fulfills list.
- Sequencing and prerequisites:
  - Respect textual prerequisites in the input. Do not place a course before its prerequisites are planned in an earlier term or satisfied by a historical term in \`takenCourses\`.
  - If a course or requirement mentions program admission (e.g., "Acceptance into the program", "Junior Core"), schedule an "Apply/Admission" checkpoint before those courses and place such courses only in terms after that checkpoint.
- Distribution of requirements:
  - Spread general education across the first several planned terms when possible; avoid front-loading or back-loading.
  - Do not schedule a term composed only of "ELECTIVE" placeholders if unmet non-elective requirements remain.
  - Fill elective needs with real catalog courses first (3–4 credits each). Only use "ELECTIVE" placeholders (1–4 credits max) if no valid catalog courses remain for that term.
  - Never create a single ELECTIVE course worth more than 4 credits; use multiple smaller courses/placeholders instead.

Planning heuristics (should follow)
- Aim for 14–16 credits per planned term when feasible.
- Prefer pairing small-credit courses together to reduce underloaded terms.
- If multiple programs are selected, interleave their requirements and avoid conflicts; count a course once even if it satisfies multiple buckets, and reflect that in "fulfills".
- Prefer the next logical start term: if \`takenCourses\` includes a latest historical term, begin planning from the immediately following term unless the input specifies a different start.
- If given Advisor instructions that conflict with these, prioritize the Advisor instructions.

Edge cases & tie-breakers
- Transfer/AP/waiver/substitution entries in \`takenCourses\`: count credits and fulfillments exactly as indicated by the input; do not attempt to reschedule them.
- Minimum grade policies: only treat a prerequisite as satisfied if the taken grade meets the specified minimum; otherwise schedule a retake.
- Co-requisites: if explicitly permitted by the input, co-requisites may be placed in the same term; otherwise treat them as prerequisites.
- Final small shortfall: if all non-elective requirements are complete and fewer than 12 credits remain to reach the target total, fill with real catalog electives (prefer 3–4 credits) and, only if exhausted, use 1–4 credit ELECTIVE placeholders to reach the target total while keeping each term within 12–18 credits.

Output format
- Return ONLY JSON in this exact schema (no extra text):
  Example format:
  ${JSON.stringify(exampleStructure, null, 2)}

Input data:
${JSON.stringify(coursesData, null, 2)}
    `;

    const payload = {
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 10000,
      temperature: 1,
    };

    // Call OpenAI
    let resp: Response;
    const tOpenAI = Date.now();
    try {
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
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
    const _openAiMs = Date.now() - tOpenAI;
    const reqId = resp.headers.get("x-request-id") || resp.headers.get("request-id");

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error("❌ OpenAI HTTP error:", { status: resp.status, requestId: reqId, bodyPreview: trunc(errBody) });
      throw new Error(`OpenAI error ${resp.status}`);
    }

    type ChatCompletionResponse = {
      choices?: Array<{
        message?: { role?: string; content?: string };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    let aiResponse: ChatCompletionResponse;
    try {
      aiResponse = (await resp.json()) as ChatCompletionResponse;
    } catch (parseErr) {
      console.error("❌ Failed to parse OpenAI JSON:", parseErr);
      throw new Error("Unable to parse OpenAI response");
    }

    const aiText = aiResponse.choices?.[0]?.message?.content;
    if (!aiText) {
      console.error("❌ No content in AI response:", { requestId: reqId, usage: aiResponse.usage });
      throw new Error("No content received from OpenAI");
    }

    // Parse JSON (we asked for JSON mode)
    let semesterPlan: unknown;
    try {
      semesterPlan = JSON.parse(aiText);
    } catch (e) {
      console.error("❌ Error parsing AI response as JSON:", e, "| raw preview:", trunc(aiText));
      throw new Error("Invalid JSON response from AI");
    }

    // Store the raw JSON string
    try {
      const tStore = Date.now();
      const { error: insertError } = await supabase.from("ai_responses").insert({ user_id: user.id, response: aiText });
      const storeMs = Date.now() - tStore;
      if (insertError) {
        console.error("⚠️ Error storing AI response:", insertError, "| took:", storeMs, "ms");
      } else {
        console.log("💾 AI response stored successfully for user:", user.id, "| took:", storeMs, "ms");
      }
    } catch (storageError) {
      console.error("⚠️ Exception storing AI response:", storageError);
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
  planName?: string
): Promise<{ success: boolean; message: string; planId?: string }> {
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
        profileId: profileId,
        studentId: studentData?.id,
        planDetailsType: typeof planDetails,
        planDetailsLength: Array.isArray(planDetails) ? planDetails.length : 'not an array'
      });
      throw error;
    }

    return {
      success: true,
      message: 'Graduation plan submitted for approval successfully!',
      planId: data.id.toString()
    };
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

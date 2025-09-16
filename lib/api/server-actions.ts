'use server';

import { getVerifiedUser } from '../supabase/auth';
import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

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
    You are an academic advisor AI. Given the following selected courses and program requirements, 
    organize them into a logical semester-by-semester plan for a 4-year degree.
    
    Consider:
    - Prerequisites and course dependencies
    - Typical course load (12-18 credits per semester)
    - General education requirements should be spread throughout
    - Major requirements should be sequenced appropriately
    - Electives should fill gaps and meet credit requirements
    - Most students take 8 semesters (4 years), but can adjust if needed

    Output:
    - Return **ONLY** JSON matching this schema exactly (no extra text):

    Example format:
    ${JSON.stringify(exampleStructure, null, 2)}
    
    Input data:
    ${JSON.stringify(coursesData, null, 2)}
    `;
    console.log("🧾 Prompt length:", prompt.length);

    const payload = {
      model: "gpt-5-mini",
      input: prompt,
      text: { format: { type: "json_object" } }, // 👈 object, not "json_object" string
      max_output_tokens: 10000,
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
    console.error('❌ Error fetching active grad plan:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
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

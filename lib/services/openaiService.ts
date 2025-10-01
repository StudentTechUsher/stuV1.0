// Removed unused path & fs after refactor
import { supabase } from "../supabase";
import { getVerifiedUser } from "../supabase/auth";
// encodeAccessId no longer needed here after persistence refactor
import { InsertGeneratedGradPlan } from './aiDbService';
import path from 'path';
import { promises as fs } from 'fs';

// === Types ===
interface AiPromptConfig {
  prompt_name: string; // Identifier for logging/analytics
  prompt: string;      // Main user/system input text
  model?: string;      // Optional override for model; defaults applied below
  max_output_tokens?: number; // Optional override for max output tokens
}

interface OpenAIJsonResult {
  success: boolean;
  message: string;
  rawText?: string;
  parsedJson?: unknown;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  requestId?: string | null;
}

/**
 * Generic helper to execute a JSON-style prompt against OpenAI Responses API.
 * Encapsulates payload construction, network call, error handling, text extraction, and JSON parsing.
 */
export async function executeJsonPrompt(config: AiPromptConfig): Promise<OpenAIJsonResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, message: "OpenAI API key not configured" };
  }

  const {
    prompt: inputText,
    prompt_name,
    model = "gpt-5-mini",
    max_output_tokens = 25_000,
  } = config;

  const payload = {
    model,
    input: inputText,
    text: { format: { type: "json_object" } },
    max_output_tokens,
  };

  const trunc = (s: string, n = 800) => (s.length > n ? `${s.slice(0, n)}…[+${s.length - n}]` : s);

  let resp: Response;
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
    return { success: false, message: `Network error calling OpenAI for ${prompt_name}: ${networkErr instanceof Error ? networkErr.message : 'unknown error'}` };
  }

  const requestId = resp.headers.get("x-request-id") || resp.headers.get("request-id");
  if (!resp.ok) {
    const errBody = await resp.text();
    let errorMessage = `OpenAI API error (${resp.status})`;
    if ([502,503,504].includes(resp.status)) {
      errorMessage = `OpenAI temporarily unavailable (${resp.status}). Retry later.`;
    } else if (resp.status === 429) {
      errorMessage = `OpenAI rate limit exceeded (${resp.status}). Slow down or retry later.`;
    } else if (resp.status === 401) {
      errorMessage = `OpenAI authentication failed (${resp.status}). Check API key.`;
    } else if (resp.status >= 400 && resp.status < 500) {
      errorMessage = `OpenAI request error (${resp.status}). Verify payload.`;
    }
    return { success: false, message: errorMessage, rawText: trunc(errBody), requestId };
  }

  type ResponsesApiResult = {
    status?: string;
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: { value?: string } | string | null }> }>;
    incomplete_details?: { reason?: string };
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  let aiResponse: ResponsesApiResult;
  try {
    aiResponse = (await resp.json()) as ResponsesApiResult;
  } catch (parseErr) {
    return { success: false, message: `Unable to parse OpenAI JSON for ${prompt_name}: ${parseErr instanceof Error ? parseErr.message : 'unknown error'}` };
  }

  let aiText = aiResponse.output_text;
  if (!aiText && Array.isArray(aiResponse.output)) {
    aiText = aiResponse.output
      .flatMap(p => p?.content ?? [])
      .map(c => {
        if (!c) return "";
        if (typeof c.text === "string") return c.text.trim();
        const v = (c.text as { value?: string })?.value;
        return typeof v === "string" ? v.trim() : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if ((aiResponse.status && aiResponse.status !== "completed") || !aiText) {
    const reason = aiResponse.incomplete_details?.reason ?? "unknown";
    return { success: false, message: `AI run incomplete (${aiResponse.status ?? 'unknown'}: ${reason})`, rawText: aiText, requestId, usage: aiResponse.usage };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(aiText);
  } catch (e) {
    console.error("Error parsing JSON from OpenAI response:", e);
    return { success: false, message: "Invalid JSON returned by model", rawText: trunc(aiText), requestId, usage: aiResponse.usage };
  }

  return { success: true, message: "OK", rawText: aiText, parsedJson, usage: aiResponse.usage, requestId };
}

// Secure server action that handles OpenAI API calls and user authentication
type OrganizePromptInput =
  | string
  | {
      prompt_name?: string;
      prompt: string;
      model?: string;
      max_output_tokens?: number;
    };

export async function OrganizeCoursesIntoSemesters_ServerAction(
  coursesData: unknown,
  promptInput: OrganizePromptInput,
): Promise<{ success: boolean; message: string; semesterPlan?: unknown; accessId?: string }> {

  try {
    // Get the current user from session
    const user = await getVerifiedUser();
    if (!user) {
      console.error("❌ Auth error: user not authenticated");
      throw new Error("User not authenticated");
    }

    // --- Validate and serialize input data ---
    if (!coursesData || typeof coursesData !== 'object') {
      return {
        success: false,
        message: "No course selection data provided to AI generator."
      };
    }

    // Basic shape check: expect programs & generalEducation collections
    const cd: any = coursesData;
    if (!cd.programs || !cd.generalEducation) {
      return {
        success: false,
        message: "Course data missing required 'programs' or 'generalEducation' sections."
      };
    }

    // Extract selection mode (if present in payload)
    const selectionMode = cd.selectionMode || 'MANUAL';

    // Branch based on selection mode
    let processedCoursesData = coursesData;
    if (selectionMode === 'AUTO') {
      // TODO: AUTO mode logic - AI should auto-select courses for multi-option requirements
      // For now, pass through as-is. In full implementation:
      // - For each requirement with multiple course options, select one based on:
      //   * Student preferences (time-of-day, modality, work blocks if available in cd)
      //   * Catalog constraints (prerequisites, co-requisites, repeats)
      //   * Load balancing heuristics (spread credits across terms)
      // - Fallback to first valid course if no preference match
      // - Return warnings if no valid course can be selected
      console.log('📌 AUTO mode: AI will auto-select from multi-option requirements');
    } else if (selectionMode === 'MANUAL') {
      // MANUAL mode: trust student selections (already validated client-side)
      // Auto-populate single-option requirements only (done in dialog already)
      console.log('📌 MANUAL mode: using student-selected courses');
    }
    // CHOICE mode is resolved client-side to AUTO or MANUAL, so no separate branch here

    const serializedInput = JSON.stringify(processedCoursesData, null, 2);

    // Execute AI prompt via helper
    // Normalize prompt config (line referenced earlier for injection point)
    const normalized = typeof promptInput === 'string' ? {
      prompt_name: 'organize_courses_into_semesters',
      prompt: promptInput,
      model: 'gpt-5-mini',
      max_output_tokens: 25_000,
    } : {
      prompt_name: promptInput.prompt_name || 'organize_courses_into_semesters',
      prompt: promptInput.prompt,
      model: promptInput.model || 'gpt-5-mini',
      max_output_tokens: promptInput.max_output_tokens ?? 25_000,
    };

    // --- Load example structure file (semester-plan-example.json) for placeholder replacement ---
    let exampleStructureJson: string | null = null;
    try {
      const examplePath = path.join(process.cwd(), 'config', 'prompts', 'semester-plan-example.json');
      exampleStructureJson = await fs.readFile(examplePath, 'utf-8');
    } catch (e) {
      console.warn('⚠️ Could not read semester-plan-example.json:', e);
    }

    // Prepare base prompt with placeholder substitution patterns.
    // Supported placeholders:
    //  - ${JSON.stringify(exampleStructure, null, 2)}
    //  - ${JSON.stringify(coursesData, null, 2)}
    //  - {{EXAMPLE_STRUCTURE_JSON}}
    //  - {{INPUT_JSON}} or {{COURSES_DATA_JSON}}
    let basePrompt = normalized.prompt || '';

    if (exampleStructureJson) {
      const examplePretty = exampleStructureJson.trim();
      basePrompt = basePrompt
        .replace(/\$\{JSON\.stringify\(exampleStructure,\s*null,\s*2\)\}/g, examplePretty)
        .replace(/\{\{EXAMPLE_STRUCTURE_JSON\}\}/g, examplePretty);
    }

    basePrompt = basePrompt
      .replace(/\$\{JSON\.stringify\(coursesData,\s*null,\s*2\)\}/g, serializedInput)
      .replace(/\{\{COURSES_DATA_JSON\}\}/g, serializedInput);

    // If INPUT_JSON placeholder exists, inject there; else append a clearly delimited section.
    let mergedPrompt: string;
    if (basePrompt.includes('{{INPUT_JSON}}')) {
      mergedPrompt = basePrompt.replace('{{INPUT_JSON}}', serializedInput);
    } else if (basePrompt.includes('{{COURSES_DATA_JSON}}')) {
      mergedPrompt = basePrompt; // already replaced above
    } else {
      mergedPrompt = `${basePrompt}\n\nINPUT_JSON (selected courses & requirements):\n${serializedInput}`;
    }

    const aiResult = await executeJsonPrompt({ ...normalized, prompt: mergedPrompt });

    if (!aiResult.success || !aiResult.rawText) {
      throw new Error(aiResult.message || 'AI generation failed');
    }

    const semesterPlan = aiResult.parsedJson;
    const aiText = aiResult.rawText;

    // Store the raw JSON string
    try {
      const tStore = Date.now();
  const outputTokens = aiResult.usage?.completion_tokens || 0; // Default to 0 instead of null
      const { error: insertError } = await supabase.from("ai_responses").insert({ 
        user_id: user.id, 
        response: aiText,
        user_prompt: normalized.prompt,
        output_tokens: outputTokens
      });
      const storeMs = Date.now() - tStore;
      if (insertError) {
        console.error("⚠️ Error storing AI response:", insertError, "| took:", storeMs, "ms");
      }
    } catch (storageError) {
      console.error("⚠️ Exception storing AI response:", storageError);
    }

    // Get the student_id (number) from the students table using the profile_id (UUID)
    const { data: studentData, error: studentError } = await supabase
      .from('student')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (studentError || !studentData?.id) {
      console.error('Error fetching student_id from students table:', studentError);
      throw new Error('Could not find student record');
    }

    // Persist generated plan via helper (store structured object/array, not raw JSON string)
    let accessId: string | undefined;
    try {
      let planData: unknown = semesterPlan;
      if (typeof planData === 'string') {
        try { planData = JSON.parse(planData); } catch {/* leave as string if it can't parse */}
      }
      const { accessId: generatedAccessId } = await InsertGeneratedGradPlan({
        studentId: studentData.id,
        planData,
        programsInPlan: Array.isArray(cd.selectedPrograms)
          ? cd.selectedPrograms
              .map((p: string | number) => Number(p))
              .filter((n: number) => !Number.isNaN(n))
          : [],
        isActive: false,
      });
      accessId = generatedAccessId;
    } catch (persistErr) {
      console.error('⚠️ Error storing grad plan via helper:', persistErr);
    }

    return {
      success: true,
      message: "Semester plan generated successfully!",
      semesterPlan,
      accessId,
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
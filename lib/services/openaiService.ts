// Removed unused path & fs after refactor
import { supabase } from "../supabase";
import { GetMajorsForUniversity } from '../services/programService';
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

// ----------------------------------------------
// Advisor-driven reorganization of existing grad plan
// ----------------------------------------------
/**
 * Re-organizes an existing graduation plan using advisor context.
 * Fetches the advisor-specific prompt template from DB (advisor_organize_grad_plan),
 * injects CURRENT_PLAN JSON and ADVISOR_NOTES, and invokes an edge function
 * (advisorCreateGradPlan) that performs the generation. This function does NOT
 * persist a new plan automatically; caller can decide whether to store or diff.
 */
export async function AdvisorOrganizeExistingPlan_ServerAction(args: {
  currentPlan: unknown;          // Existing plan structure (object/array)
  advisorNotes: string;          // Free-form advisor notes / constraints
  studentProfileId?: string;     // Optional (for future auditing)
}): Promise<{ success: boolean; message: string; revisedPlan?: unknown; rawText?: string }> {
  const { currentPlan, advisorNotes } = args;
  try {
    // Verify user (advisor expected) shares same auth pathway
    const user = await getVerifiedUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    // Get the advisor-specific base prompt
    const basePrompt = await (await import('./aiDbService')).GetAiPrompt('advisor_organize_grad_plan');
    if (!basePrompt) {
      return { success: false, message: 'Advisor prompt template not found (advisor_organize_grad_plan)' };
    }

    // Serialize inputs
    const planJson = (() => {
      try { return JSON.stringify(currentPlan, null, 2); } catch { return '"<unstringifiable plan>"'; }
    })();
    const notesSanitized = advisorNotes?.trim() || 'None provided';

    // Compose final prompt body for the edge function (edge may itself expand this further)
    const effectivePrompt = `${basePrompt}\n\nCURRENT_PLAN_JSON:\n${planJson}\n\nADVISOR_NOTES:\n${notesSanitized}`;

    // Invoke edge function which encapsulates model call (so we reuse deployed logic / quotas)
    const { data, error } = await supabase.functions.invoke('advisorCreateGradPlan', {
      body: {
        prompt: effectivePrompt,
        // Include structured fields separately for downstream observability or alternate parsing
        current_plan: currentPlan,
        advisor_notes: notesSanitized,
        invoking_user: user.id,
      }
    });

    if (error) {
      console.error('❌ Edge function advisorCreateGradPlan error:', error);
      return { success: false, message: 'Edge function invocation failed' };
    }

    // Expect edge function to return shape { revisedPlan, rawText, message? }
    const revisedPlan = (data && (data.revisedPlan || data.plan || data.semesterPlan)) ?? null;
    const rawText: string | undefined = data?.rawText;

    if (!revisedPlan) {
      return { success: false, message: 'Edge function returned no revised plan', rawText };
    }

    return { success: true, message: 'Revised plan generated', revisedPlan, rawText };
  } catch (err) {
    console.error('🛑 AdvisorOrganizeExistingPlan_ServerAction error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ----------------------------------------------
// Major Pivot Career Suggestion Flow
// ----------------------------------------------
/**
 * Generates up to 5 suggested career pivot options based on user reflection inputs
 * and completed courses. Returns a JSON array of objects
 *   [{ id: string, title: string, rationale: string }]
 * plus a guidance message. The id can be a kebab-case slug derived from title.
 * If reRequest is true (user chose "None of these"), instruct the model to avoid
 * repeating previous titles (pass priorIds). This does not persist anything yet.
 */
export async function GetMajorPivotCareerSuggestions_ServerAction(args: {
  currentMajor: string;
  form: {
    whyMajor: string; notWorking: string; partsLiked: string; wantCareerHelp: boolean; consideredCareer: string;
  };
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string; tags?: string[] }>;
  priorIds?: string[]; // previously shown option ids (kebab-case)
  reRequest?: boolean; // true if user clicked "None of these"
}): Promise<{ success: boolean; message: string; options?: Array<{ id: string; title: string; rationale: string }>; rawText?: string; requestId?: string }>{
  try {
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'User not authenticated' };

    const { currentMajor, form, completedCourses, priorIds = [], reRequest } = args;

    if (!form.wantCareerHelp) {
      return { success: false, message: 'Career help flag is false; suggestions not requested.' };
    }

    // Build prompt
    const baseInstruction = `You are an academic/career pivot assistant. Given a student's reflective answers and completed coursework, suggest 5 distinct potential target career directions.
Return ONLY a valid JSON object with shape: { "options": [ { "id": string, "title": string, "rationale": string } ], "message": string }.
Rules:
- id: kebab-case slug of title (lowercase, hyphens, no special chars beyond hyphen)
- title: concise (<= 45 chars), compelling career direction or role family
- rationale: 1-2 sentences referencing their motivations / strengths / coursework
- Avoid generic fluff; anchor in specific signals.
- Do not wrap JSON in markdown fences.
${reRequest ? '- Provide NEW options not overlapping prior ids: ' + priorIds.join(', ') + '\n' : ''}`;

    const reflectionBlock = `REFLECTION_INPUTS:\nWHY_MAJOR: ${form.whyMajor || 'N/A'}\nNOT_WORKING: ${form.notWorking || 'N/A'}\nPARTS_LIKED: ${form.partsLiked || 'N/A'}\nCONSIDERED_CAREER: ${form.wantCareerHelp ? 'User requested suggestions' : form.consideredCareer || 'N/A'}\n`;

    const coursesBlock = 'COMPLETED_COURSES:\n' + completedCourses.map(c => `- ${c.code}: ${c.title}${c.tags?.length ? ' [' + c.tags.join(',') + ']' : ''}`).join('\n');

    const prompt = `${baseInstruction}\n\nCURRENT_MAJOR: ${currentMajor}\n${reflectionBlock}\n${coursesBlock}\n\nReturn JSON now.`;

    const aiResult = await executeJsonPrompt({
      prompt_name: reRequest ? 'major_pivot_career_suggestions_retry' : 'major_pivot_career_suggestions',
      prompt,
      model: 'gpt-5-mini',
      max_output_tokens: 2000,
    });

    // Log prompt & (attempted) response to ai_responses table
    try {
      const { error: insertErr } = await supabase.from('ai_responses').insert({
        user_id: user.id,
        user_prompt: prompt,
        response: aiResult.rawText || aiResult.message,
        output_tokens: aiResult.usage?.completion_tokens || 0,
      });
      if (insertErr) {
        console.error('⚠️ Failed to log career suggestions AI response:', insertErr);
      }
    } catch (logErr) {
      console.error('⚠️ Exception while logging career suggestions AI response:', logErr);
    }

    if (!aiResult.success) {
      const reqId = aiResult.requestId ?? undefined;
      return { success: false, message: aiResult.message, rawText: aiResult.rawText, requestId: reqId };
    }

    const parsed = aiResult.parsedJson as any;
    if (!parsed || !Array.isArray(parsed.options)) {
      const reqId = aiResult.requestId ?? undefined;
      return { success: false, message: 'Model returned unexpected shape', rawText: aiResult.rawText, requestId: reqId };
    }

    // Simple post-validate and normalize
    const options = parsed.options
      .slice(0, 5)
      .map((o: any) => {
        let id: string;
        if (typeof o.id === 'string') {
          id = o.id;
        } else if (typeof o.title === 'string') {
          const slugSource = o.title.toLowerCase();
          id = slugSource
            .replace(/[^a-z0-9]+/g, '-') // collapse non-alphanumerics
            .replace(/(^-|-$)/g, ''); // trim leading/trailing hyphen
          if (!id) id = 'option';
        } else {
          id = 'option';
        }
        return {
          id,
          title: String(o.title ?? 'Untitled Option'),
            rationale: String(o.rationale ?? 'No rationale provided'),
        };
      });

    return {
      success: true,
      message: typeof parsed.message === 'string' ? parsed.message : 'Here are some potential pivot directions.',
      options,
      rawText: aiResult.rawText,
      requestId: aiResult.requestId ?? undefined,
    };
  } catch (err) {
    console.error('GetMajorPivotCareerSuggestions_ServerAction error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ----------------------------------------------
// Adjacent Career Suggestion Flow
// ----------------------------------------------
/**
 * Suggest 5 adjacent / related career directions given what the student likes about their major
 * and a target industry/domain interest. Focus on roles leveraging existing strengths while
 * expanding toward the domain. Output JSON:
 * { "options": [ { "id": string, "title": string, "rationale": string } ], "message": string }
 */
export async function GetAdjacentCareerSuggestions_ServerAction(args: {
  currentMajor: string;
  whyLikeMajor: string;
  targetIndustry: string;
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string; tags?: string[] }>;
}): Promise<{ success: boolean; message: string; options?: Array<{ id: string; title: string; rationale: string }>; rawText?: string; requestId?: string }>{
  try {
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'User not authenticated' };

    const { currentMajor, whyLikeMajor, targetIndustry, completedCourses } = args;

    const coursesBlock = 'COMPLETED_COURSES:\n' + completedCourses.map(c => `- ${c.code}: ${c.title}${c.tags?.length ? ' [' + c.tags.join(',') + ']' : ''}`).join('\n');
    const prompt = `You are an academic/career advising assistant. A student wants to explore adjacent career directions leveraging what they enjoy about their current major while moving toward a target industry/domain. Produce 5 distinct adjacent career directions (not duplicate generic titles).\nReturn ONLY valid JSON: { "options": [ { "id": string, "title": string, "rationale": string } ], "message": string }.\nRules:\n- id: kebab-case slug of title\n- title: <= 45 chars, specific enough to distinguish (e.g. 'Clinical Data Analyst' not just 'Analyst')\n- rationale: 1 concise sentence linking their liked aspects + domain + existing coursework signals\n- Avoid pure lateral duplicates of their current major; emphasize adjacency or domain overlay\n- Do not wrap JSON in markdown fences.\n\nCURRENT_MAJOR: ${currentMajor}\nWHY_LIKE_MAJOR: ${whyLikeMajor || 'N/A'}\nTARGET_INDUSTRY: ${targetIndustry || 'N/A'}\n${coursesBlock}\n\nReturn JSON now.`;

    const aiResult = await executeJsonPrompt({
      prompt_name: 'adjacent_career_suggestions',
      prompt,
      model: 'gpt-5-mini',
      max_output_tokens: 2000,
    });

    // Log prompt & response
    try {
      const { error: insertErr } = await supabase.from('ai_responses').insert({
        user_id: user.id,
        user_prompt: prompt,
        response: aiResult.rawText || aiResult.message,
        output_tokens: aiResult.usage?.completion_tokens || 0,
      });
      if (insertErr) console.error('⚠️ Failed to log adjacent career suggestions AI response:', insertErr);
    } catch (logErr) {
      console.error('⚠️ Exception logging adjacent career suggestions AI response:', logErr);
    }

    if (!aiResult.success) {
      return { success: false, message: aiResult.message, rawText: aiResult.rawText, requestId: aiResult.requestId ?? undefined };
    }
    const parsed = aiResult.parsedJson as any;
    if (!parsed || !Array.isArray(parsed.options)) {
      return { success: false, message: 'Model returned unexpected shape', rawText: aiResult.rawText, requestId: aiResult.requestId ?? undefined };
    }

    const options = parsed.options.slice(0,5).map((o: any) => {
      const title = String(o.title ?? 'Untitled Option');
      let id: string = typeof o.id === 'string' ? o.id : title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
      if (!id) id = 'option';
      return { id, title, rationale: String(o.rationale ?? 'No rationale provided') };
    });

    return {
      success: true,
      message: typeof parsed.message === 'string' ? parsed.message : 'Here are some adjacent directions.',
      options,
      rawText: aiResult.rawText,
      requestId: aiResult.requestId ?? undefined,
    };
  } catch (err) {
    console.error('GetAdjacentCareerSuggestions_ServerAction error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ----------------------------------------------
// Follow-up: Recommend Majors for Selected Career Option
// ----------------------------------------------
/**
 * Given a previously suggested career option the student clicked, produce 2-3
 * relevant academic majors (existing standard university majors) they could
 * pursue to align with that career. Return JSON shape:
 * { "majors": [ { "code": string, "name": string, "rationale": string } ], "message": string }
 * - code: short slug (kebab or lowercase, <= 20 chars)
 * - name: full major name (<= 60 chars)
 * - rationale: 1 short sentence referencing the selected career & their reflection inputs
 */
export async function GetMajorsForCareerSelection_ServerAction(args: {
  currentMajor: string;
  selectedCareerId: string;
  selectedCareerTitle: string; // human readable title user clicked
  form: { whyMajor: string; notWorking: string; partsLiked: string; wantCareerHelp: boolean; consideredCareer: string; };
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string; tags?: string[] }>;
  universityId?: number; // optionally restrict to this university's majors
}): Promise<{ success: boolean; message: string; majors?: Array<{ code: string; name: string; rationale: string }>; rawText?: string; requestId?: string }>{
  try {
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'User not authenticated' };

    const { currentMajor, selectedCareerId, selectedCareerTitle, form, completedCourses, universityId } = args;

    // Fetch allowed majors list (fallback to universityId=1 if not provided) and constrain selection
    let majorsCatalogSnippet = '';
    const effectiveUniversityId = (typeof universityId === 'number' && !Number.isNaN(universityId)) ? universityId : 1;
    try {
      const majorsData = await GetMajorsForUniversity(effectiveUniversityId);
      if (majorsData && majorsData.length) {
        const names = majorsData
          .map((m: any) => m.name?.trim())
          .filter(Boolean)
          .slice(0, 400);
        if (names.length) {
          majorsCatalogSnippet = `ALLOWED_MAJORS_LIST (choose only from these; prefer closest alignment):\n- ${names.join('\n- ')}`;
        }
      }
    } catch (catalogErr) {
      console.warn('⚠️ Could not load majors catalog for AI constraint:', catalogErr);
    }

    const reflectionBlock = `REFLECTION_INPUTS:\nWHY_MAJOR: ${form.whyMajor || 'N/A'}\nNOT_WORKING: ${form.notWorking || 'N/A'}\nPARTS_LIKED: ${form.partsLiked || 'N/A'}\nCONSIDERED_CAREER: ${form.consideredCareer || 'N/A'}\n`;
    const coursesBlock = 'COMPLETED_COURSES:\n' + completedCourses.map(c => `- ${c.code}: ${c.title}${c.tags?.length ? ' [' + c.tags.join(',') + ']' : ''}`).join('\n');

  const prompt = `You are an academic advising assistant. A student selected a target career option you previously suggested: "${selectedCareerTitle}" (id: ${selectedCareerId}). Their current major is ${currentMajor}. Based on their reflections and completed courses, recommend 2 or 3 plausible existing academic majors they should consider pivoting to that strategically support that career.\nReturn ONLY valid JSON: { "majors": [ { "code": string, "name": string, "rationale": string } ], "message": string }.\nRules:\n- majors array length: 2 or 3 (never more)\n- code: short lowercase slug (letters, digits, hyphens) derived from the name\n- name: must exactly match one of the allowed majors listed below${majorsCatalogSnippet ? ' (do NOT invent new majors)' : ''}\n- rationale: concise (<= 110 chars) citing alignment to the selected career and their retained interests.\n- If no strong match exists, pick the closest academically sound options.\n- If uncertain about legitimacy of a major, exclude it.\n- Do not wrap JSON in markdown fences.\n\nCURRENT_MAJOR: ${currentMajor}\nSELECTED_CAREER_TITLE: ${selectedCareerTitle}\n${reflectionBlock}\n${coursesBlock}\n${majorsCatalogSnippet ? '\n' + majorsCatalogSnippet + '\n' : ''}\nReturn JSON now.`;

    const aiResult = await executeJsonPrompt({
      prompt_name: 'majors_for_selected_career',
      prompt,
      model: 'gpt-5-mini',
      max_output_tokens: 1500,
    });

    // Log prompt & response
    try {
      const { error: insertErr } = await supabase.from('ai_responses').insert({
        user_id: user.id,
        user_prompt: prompt,
        response: aiResult.rawText || aiResult.message,
        output_tokens: aiResult.usage?.completion_tokens || 0,
      });
      if (insertErr) console.error('⚠️ Failed to log majors-for-career AI response:', insertErr);
    } catch (logErr) {
      console.error('⚠️ Exception logging majors-for-career AI response:', logErr);
    }

    if (!aiResult.success) {
      return { success: false, message: aiResult.message, rawText: aiResult.rawText, requestId: aiResult.requestId ?? undefined };
    }

    const parsed = aiResult.parsedJson as any;
    if (!parsed || !Array.isArray(parsed.majors)) {
      return { success: false, message: 'Model returned unexpected shape (majors missing)', rawText: aiResult.rawText, requestId: aiResult.requestId ?? undefined };
    }

    const majors = parsed.majors.slice(0, 3).map((m: any) => {
      const name = String(m.name ?? 'Unnamed Major');
      const code = typeof m.code === 'string' && m.code.trim()
        ? m.code.trim().toLowerCase()
        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return {
        code: code || 'major',
        name,
        rationale: String(m.rationale ?? 'No rationale provided')
      };
    });

    return {
      success: true,
      message: typeof parsed.message === 'string' ? parsed.message : 'Select a major to continue.',
      majors,
      rawText: aiResult.rawText,
      requestId: aiResult.requestId ?? undefined,
    };
  } catch (err) {
    console.error('GetMajorsForCareerSelection_ServerAction error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ----------------------------------------------
// Near-Completion Minor Audit
// ----------------------------------------------
/**
 * Given a list of completed courses (codes/titles) and the catalog of minors (name + requirements JSON),
 * ask AI to identify up to 5 minors where the student appears to have already satisfied multiple required
 * or strongly aligned courses. The model should output JSON:
 * { "minors": [ { "id": string, "name": string, "reason": string } ], "message": string }
 * - id: kebab-case slug of the minor name
 * - reason: concise rationale referencing matched courses or categories (<= 180 chars)
 */
export async function GetNearCompletionMinorAudit_ServerAction(args: {
  currentMajor?: string;
  completedCourses: Array<{ code: string; title: string; credits?: number; grade?: string }>;
  minors: Array<{ id: number | string; name: string; requirements: unknown }>;
}): Promise<{ success: boolean; message: string; minors?: Array<{ id: string; name: string; reason: string }>; rawText?: string; requestId?: string }> {
  try {
    const { completedCourses, minors } = args;
    if (!Array.isArray(completedCourses) || !completedCourses.length) {
      return { success: false, message: 'No completed courses provided' };
    }
    if (!Array.isArray(minors) || !minors.length) {
      return { success: false, message: 'No minors available to audit' };
    }

    const courseJson = JSON.stringify(completedCourses, null, 2);
    // Reduce requirements blob to size-limited descriptor (AI can still parse codes)
    const minorsSlim = minors.map(m => ({ id: m.id, name: m.name, requirements: m.requirements })).slice(0, 120); // safety cap
    const minorsJson = JSON.stringify(minorsSlim, null, 2);

    const prompt = `You are an academic audit assistant.
Student Completed Courses (JSON):\n${courseJson}\n\nMinor Catalog (JSON):\n${minorsJson}\n\nTask: Identify up to 5 minors (less if few are relevant) for which the student appears PARTIALLY COMPLETE or CLOSE, based ONLY on overlapping course codes or obviously satisfied requirement clusters. Prefer minors where >=2 courses seem to match.
Rules:
- Output strictly valid JSON.
- Do NOT hallucinate minors not in the provided list.
- If no overlaps beyond 1 course for any minor, return an empty array.
- Keep reason concise (<=180 chars) and mention 1-3 matched course codes.
JSON Shape:
{
  "minors": [ { "id": "kebab-case-name", "name": "Minor Name", "reason": "short rationale" } ],
  "message": "short guidance summary"
}`;

    const aiResult = await executeJsonPrompt({ prompt_name: 'near_completion_minor_audit', prompt, model: 'gpt-5-mini', max_output_tokens: 4000 });
    if (!aiResult.success) {
      return { success: false, message: aiResult.message, rawText: aiResult.rawText ?? undefined, requestId: aiResult.requestId ?? undefined };
    }
    const parsed = aiResult.parsedJson as any;
    const outMinors: Array<{ id: string; name: string; reason: string }> = Array.isArray(parsed?.minors)
      ? parsed.minors.map((m: any) => {
          let idCandidate: string | undefined;
          if (typeof m.id === 'string' && m.id.trim()) {
            idCandidate = m.id.trim();
          } else if (typeof m.name === 'string') {
            idCandidate = m.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
          }
          if (!(idCandidate?.length)) {
            idCandidate = 'minor';
          }
          const name = String(m.name || m.id || 'Unknown Minor').slice(0, 80);
          const reason = String(m.reason || m.rationale || '').slice(0, 220);
          return { id: idCandidate, name, reason };
        })
      : [];
    const message = typeof parsed?.message === 'string' ? parsed.message : 'Potential minors you may be close to completing.';
  return { success: true, message, minors: outMinors, rawText: aiResult.rawText ?? undefined, requestId: aiResult.requestId ?? undefined };
  } catch (err) {
    console.error('Minor audit AI error:', err);
    return { success: false, message: 'Failed to run minor completion audit' };
  }
}


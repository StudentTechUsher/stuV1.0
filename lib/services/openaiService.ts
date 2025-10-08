// Removed unused path & fs after refactor
import { supabase } from "../supabase";
import { GetMajorsForUniversity } from '../services/programService';
import { getVerifiedUser } from "../supabase/auth";
// encodeAccessId no longer needed here after persistence refactor
import { InsertGeneratedGradPlan, InsertAiChatExchange } from './aiDbService';
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
    const processedCoursesData = coursesData;
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
    let planData: unknown = semesterPlan;
    if (typeof planData === 'string') {
      try { planData = JSON.parse(planData); } catch {/* leave as string if it can't parse */}
    }
    const { accessId } = await InsertGeneratedGradPlan({
      studentId: studentData.id,
      planData,
      programsInPlan: Array.isArray(cd.selectedPrograms)
        ? cd.selectedPrograms
            .map((p: string | number) => Number(p))
            .filter((n: number) => !Number.isNaN(n))
        : [],
      isActive: false,
    });

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
// Career Data Enrichment
// ----------------------------------------------
/**
 * Given a career title and optional context (rationale from initial suggestion),
 * generate comprehensive career information including education, skills, salary estimates,
 * job outlook, day-to-day activities, and recommendations.
 *
 * Returns a partial Career object that can be used to populate the CareerInfoModal.
 * This is meant to enrich AI-suggested careers with detailed information.
 */
export async function EnrichCareerData_ServerAction(args: {
  careerTitle: string;
  slug: string;
  rationale?: string; // The AI-generated rationale from the initial suggestion
  studentContext?: {
    currentMajor?: string;
    completedCourses?: Array<{ code: string; title: string; }>;
  };
}): Promise<{
  success: boolean;
  message: string;
  careerData?: {
    education: { typicalLevel: string; certifications?: string[] };
    bestMajors: Array<{ id: string; name: string }>;
    locationHubs: string[];
    salaryUSD: { entry?: number; median?: number; p90?: number; source?: string };
    outlook: { growthLabel?: string; notes?: string; source?: string };
    topSkills: string[];
    dayToDay: string[];
    recommendedCourses?: string[];
    internships?: string[];
    clubs?: string[];
    relatedCareers?: string[];
    links?: Array<{ label: string; url: string }>;
  };
  rawText?: string;
  requestId?: string;
}> {
  try {
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'User not authenticated' };

    const { careerTitle, slug, rationale, studentContext } = args;

    const contextBlock = studentContext?.currentMajor
      ? `\nSTUDENT_CONTEXT:\n- Current Major: ${studentContext.currentMajor}\n- Completed Courses: ${studentContext.completedCourses?.map(c => c.code).join(', ') || 'N/A'}\n`
      : '';

    const rationaleBlock = rationale ? `\nORIGINAL_RATIONALE: ${rationale}\n` : '';

    const prompt = `You are a career information specialist. Generate comprehensive, accurate career data for the following role.

CAREER_TITLE: ${careerTitle}
${rationaleBlock}${contextBlock}

Return ONLY valid JSON with the following structure. Do not wrap in markdown fences.
{
  "education": {
    "typicalLevel": "BACHELOR" | "MASTER" | "PHD" | "VARIES",
    "certifications": ["cert1", "cert2"] // Optional relevant certifications
  },
  "bestMajors": [
    { "id": "slug-name", "name": "Computer Science" }
    // 2-4 majors that best prepare for this career
  ],
  "locationHubs": [
    "Bay Area, CA",
    "NYC, NY"
    // Top 3-5 U.S. cities/regions where this career thrives
  ],
  "salaryUSD": {
    "entry": 60000, // Entry-level annual salary (realistic estimate)
    "median": 85000, // Mid-career median
    "p90": 120000, // 90th percentile
    "source": "Based on BLS and industry data 2024"
  },
  "outlook": {
    "growthLabel": "Hot" | "Growing" | "Stable" | "Declining",
    "notes": "Brief 1-2 sentence outlook explanation",
    "source": "BLS projections 2024-2034"
  },
  "topSkills": [
    "Python",
    "Data Analysis",
    "SQL"
    // 5-8 key technical and soft skills
  ],
  "dayToDay": [
    "Analyze datasets to identify trends and insights",
    "Create visualizations and reports for stakeholders"
    // 4-6 typical daily activities
  ],
  "recommendedCourses": [
    "Statistics and Probability",
    "Database Management"
    // 3-5 useful courses (generic enough for any university)
  ],
  "internships": [
    "Data analytics internships at tech companies",
    "Business intelligence roles at consulting firms"
    // 2-3 types of relevant internship opportunities
  ],
  "clubs": [
    "Data Science Club",
    "Analytics & Business Intelligence Association"
    // 2-3 relevant student organizations
  ],
  "relatedCareers": [
    "business-intelligence-analyst",
    "data-scientist",
    "market-research-analyst"
    // 3-5 related career slugs (kebab-case)
  ],
  "links": [
    { "label": "BLS Occupational Outlook", "url": "https://www.bls.gov/ooh/" },
    { "label": "O*NET Career Profile", "url": "https://www.onetonline.org/" }
    // 2-3 authoritative career information sources
  ]
}

IMPORTANT GUIDELINES:
- Use realistic, research-based salary estimates (not inflated)
- Choose growth labels based on actual labor market trends
- Focus on transferable skills and activities
- Keep courses generic enough to apply across universities
- Related careers should use kebab-case slugs
- Provide actionable, specific information
- If uncertain about exact data, provide reasonable professional estimates and note in source field

Return JSON now.`;

    const aiResult = await executeJsonPrompt({
      prompt_name: 'enrich_career_data',
      prompt,
      model: 'gpt-5-mini',
      max_output_tokens: 4000,
    });

    // Log to ai_responses
    try {
      const { error: insertErr } = await supabase.from('ai_responses').insert({
        user_id: user.id,
        user_prompt: prompt,
        response: aiResult.rawText || aiResult.message,
        output_tokens: aiResult.usage?.completion_tokens || 0,
      });
      if (insertErr) console.error('⚠️ Failed to log career enrichment AI response:', insertErr);
    } catch (logErr) {
      console.error('⚠️ Exception logging career enrichment AI response:', logErr);
    }

    if (!aiResult.success) {
      return {
        success: false,
        message: aiResult.message,
        rawText: aiResult.rawText,
        requestId: aiResult.requestId ?? undefined
      };
    }

    const parsed = aiResult.parsedJson as any;
    if (!parsed || typeof parsed !== 'object') {
      return {
        success: false,
        message: 'Model returned unexpected shape',
        rawText: aiResult.rawText,
        requestId: aiResult.requestId ?? undefined
      };
    }

    // Validate and normalize the response
    const careerData = {
      education: {
        typicalLevel: parsed.education?.typicalLevel || 'BACHELOR',
        certifications: Array.isArray(parsed.education?.certifications) ? parsed.education.certifications : []
      },
      bestMajors: Array.isArray(parsed.bestMajors) ? parsed.bestMajors : [],
      locationHubs: Array.isArray(parsed.locationHubs) ? parsed.locationHubs : [],
      salaryUSD: {
        entry: parsed.salaryUSD?.entry,
        median: parsed.salaryUSD?.median,
        p90: parsed.salaryUSD?.p90,
        source: parsed.salaryUSD?.source || 'AI estimate based on industry data'
      },
      outlook: {
        growthLabel: parsed.outlook?.growthLabel,
        notes: parsed.outlook?.notes,
        source: parsed.outlook?.source || 'AI projection based on market trends'
      },
      topSkills: Array.isArray(parsed.topSkills) ? parsed.topSkills : [],
      dayToDay: Array.isArray(parsed.dayToDay) ? parsed.dayToDay : [],
      recommendedCourses: Array.isArray(parsed.recommendedCourses) ? parsed.recommendedCourses : [],
      internships: Array.isArray(parsed.internships) ? parsed.internships : [],
      clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
      relatedCareers: Array.isArray(parsed.relatedCareers) ? parsed.relatedCareers : [],
      links: Array.isArray(parsed.links) ? parsed.links : []
    };

    return {
      success: true,
      message: 'Career data enriched successfully',
      careerData,
      rawText: aiResult.rawText,
      requestId: aiResult.requestId ?? undefined
    };
  } catch (err) {
    console.error('EnrichCareerData_ServerAction error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ----------------------------------------------
// Major Data Enrichment
// ----------------------------------------------
/**
 * Given a major name and optional context, generate comprehensive major information
 * including course requirements, career paths, skills, equivalencies, and opportunities.
 *
 * Returns a partial MajorInfo object that can be used to populate the major detail dialog.
 * This enriches AI-suggested majors with detailed institutional information.
 */
export async function EnrichMajorData_ServerAction(args: {
  majorName: string;
  slug: string;
  rationale?: string; // The AI-generated rationale from the major suggestion
  studentContext?: {
    currentMajor?: string;
    completedCourses?: Array<{ code: string; title: string; }>;
    targetCareer?: string;
  };
  universityName?: string; // e.g., "Brigham Young University"
}): Promise<{
  success: boolean;
  message: string;
  majorData?: {
    degreeType: string;
    shortOverview: string;
    overview: string;
    topCareers: Array<{ slug: string; title: string }>;
    careerOutlook: string;
    totalCredits: number;
    typicalDuration: string;
    coreCourses: string[];
    electiveCourses?: string[];
    courseEquivalencies: Array<{ institutionCourse: string; equivalentCourses: string[]; notes?: string }>;
    prerequisites: string[];
    mathRequirements?: string;
    otherRequirements?: string;
    topSkills: string[];
    learningOutcomes: string[];
    internshipOpportunities?: string[];
    researchAreas?: string[];
    studyAbroadOptions?: string[];
    clubs?: string[];
    relatedMajors?: string[];
    commonMinors?: string[];
    dualDegreeOptions?: string[];
    departmentWebsite?: string;
    advisingContact?: string;
    links?: Array<{ label: string; url: string }>;
  };
  rawText?: string;
  requestId?: string;
}> {
  try {
    const user = await getVerifiedUser();
    if (!user) return { success: false, message: 'User not authenticated' };

    const { majorName, slug, rationale, studentContext, universityName } = args;

    const universityBlock = universityName ? `\nUNIVERSITY: ${universityName}\n` : '';
    const contextBlock = studentContext?.currentMajor
      ? `\nSTUDENT_CONTEXT:\n- Current Major: ${studentContext.currentMajor}\n- Completed Courses: ${studentContext.completedCourses?.map(c => c.code).join(', ') || 'N/A'}\n- Target Career: ${studentContext.targetCareer || 'N/A'}\n`
      : '';
    const rationaleBlock = rationale ? `\nORIGINAL_RATIONALE: ${rationale}\n` : '';

    const prompt = `You are an academic program specialist. Generate comprehensive, accurate information for the following major/program.

MAJOR_NAME: ${majorName}
${universityBlock}${rationaleBlock}${contextBlock}

Return ONLY valid JSON with the following structure. Do not wrap in markdown fences.
{
  "degreeType": "BS" | "BA" | "BFA" | "VARIES",
  "shortOverview": "1-2 sentence teaser about this major",
  "overview": "2-3 paragraphs describing the major, what students study, and why it's valuable",
  "topCareers": [
    { "slug": "software-engineer", "title": "Software Engineer" },
    { "slug": "data-analyst", "title": "Data Analyst" }
    // Top 5-7 careers this major commonly leads to
  ],
  "careerOutlook": "1-2 sentences about job prospects and market demand for graduates",
  "totalCredits": 120, // Typical total credit hours for degree
  "typicalDuration": "4 years",
  "coreCourses": [
    "CS 142 - Intro to Computer Science",
    "CS 235 - Data Structures",
    "CS 236 - Discrete Mathematics"
    // 8-12 core required courses (use generic course codes like CS, MATH, PHYS)
  ],
  "electiveCourses": [
    "CS 455 - Machine Learning",
    "CS 460 - Computer Graphics"
    // 4-6 common elective options
  ],
  "courseEquivalencies": [
    {
      "institutionCourse": "CS 111",
      "equivalentCourses": ["IS 303", "IT 120"],
      "notes": "Intro programming - any language accepted"
    },
    {
      "institutionCourse": "MATH 112",
      "equivalentCourses": ["MATH 110", "STAT 121"],
      "notes": "Calculus I equivalent"
    }
    // 5-10 common course equivalencies/cross-listings
  ],
  "prerequisites": [
    "High school Calculus or equivalent",
    "3.0 GPA in prerequisite courses"
    // 2-4 prerequisites for declaring the major
  ],
  "mathRequirements": "Calculus I & II required; Linear Algebra recommended",
  "otherRequirements": "Minimum 2.5 GPA in major courses; Capstone project required",
  "topSkills": [
    "Programming (Python, Java, C++)",
    "Problem Solving",
    "Algorithm Design",
    "Data Structures"
    // 6-10 key skills developed
  ],
  "learningOutcomes": [
    "Design and implement complex software systems",
    "Analyze computational problems and develop algorithmic solutions",
    "Work effectively in team-based development environments"
    // 4-6 core learning outcomes
  ],
  "internshipOpportunities": [
    "Software development internships at tech companies",
    "Research assistant positions in CS labs",
    "Data science internships in business/healthcare"
    // 3-5 types of internship opportunities
  ],
  "researchAreas": [
    "Artificial Intelligence & Machine Learning",
    "Cybersecurity",
    "Human-Computer Interaction"
    // 3-5 active research areas in the department
  ],
  "studyAbroadOptions": [
    "Semester exchange programs with partner universities",
    "Summer research internships abroad"
    // 2-3 study abroad opportunities if applicable
  ],
  "clubs": [
    "Computer Science Club",
    "ACM Student Chapter",
    "Women in Computing"
    // 3-5 relevant student organizations
  ],
  "relatedMajors": [
    "information-systems",
    "data-science",
    "software-engineering"
    // 3-5 related major slugs (kebab-case)
  ],
  "commonMinors": [
    "Mathematics",
    "Business Administration",
    "Statistics"
    // 3-4 popular minor pairings
  ],
  "dualDegreeOptions": [
    "BS Computer Science + BS Mathematics (5 years)",
    "BS Computer Science + MBA (5 years)"
    // 1-3 dual degree options if common
  ],
  "departmentWebsite": "https://cs.university.edu",
  "advisingContact": "cs-advising@university.edu",
  "links": [
    { "label": "Degree Requirements", "url": "https://cs.university.edu/requirements" },
    { "label": "Course Catalog", "url": "https://catalog.university.edu/cs" }
    // 2-3 authoritative program information sources
  ]
}

IMPORTANT GUIDELINES:
- Use realistic course codes and credit hours typical for U.S. universities
- Course equivalencies should reflect common cross-listings and alternatives
- Focus on transferable, broadly applicable information
- Keep course codes generic enough to be recognizable (CS, MATH, PHYS, etc.)
- Career slugs should be kebab-case
- Provide actionable, specific information for prospective students
- If uncertain about specific details, provide reasonable academic estimates and note generic nature
- Learning outcomes should be measurable and specific
- Research areas should reflect current trends in the field

Return JSON now.`;

    const aiResult = await executeJsonPrompt({
      prompt_name: 'enrich_major_data',
      prompt,
      model: 'gpt-5-mini',
      max_output_tokens: 5000,
    });

    // Log to ai_responses
    try {
      const { error: insertErr } = await supabase.from('ai_responses').insert({
        user_id: user.id,
        user_prompt: prompt,
        response: aiResult.rawText || aiResult.message,
        output_tokens: aiResult.usage?.completion_tokens || 0,
      });
      if (insertErr) console.error('⚠️ Failed to log major enrichment AI response:', insertErr);
    } catch (logErr) {
      console.error('⚠️ Exception logging major enrichment AI response:', logErr);
    }

    if (!aiResult.success) {
      return {
        success: false,
        message: aiResult.message,
        rawText: aiResult.rawText,
        requestId: aiResult.requestId ?? undefined
      };
    }

    const parsed = aiResult.parsedJson as any;
    if (!parsed || typeof parsed !== 'object') {
      return {
        success: false,
        message: 'Model returned unexpected shape',
        rawText: aiResult.rawText,
        requestId: aiResult.requestId ?? undefined
      };
    }

    // Validate and normalize the response
    const majorData = {
      degreeType: parsed.degreeType || 'BS',
      shortOverview: parsed.shortOverview || '',
      overview: parsed.overview || '',
      topCareers: Array.isArray(parsed.topCareers) ? parsed.topCareers : [],
      careerOutlook: parsed.careerOutlook || '',
      totalCredits: parsed.totalCredits || 120,
      typicalDuration: parsed.typicalDuration || '4 years',
      coreCourses: Array.isArray(parsed.coreCourses) ? parsed.coreCourses : [],
      electiveCourses: Array.isArray(parsed.electiveCourses) ? parsed.electiveCourses : [],
      courseEquivalencies: Array.isArray(parsed.courseEquivalencies) ? parsed.courseEquivalencies : [],
      prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
      mathRequirements: parsed.mathRequirements,
      otherRequirements: parsed.otherRequirements,
      topSkills: Array.isArray(parsed.topSkills) ? parsed.topSkills : [],
      learningOutcomes: Array.isArray(parsed.learningOutcomes) ? parsed.learningOutcomes : [],
      internshipOpportunities: Array.isArray(parsed.internshipOpportunities) ? parsed.internshipOpportunities : [],
      researchAreas: Array.isArray(parsed.researchAreas) ? parsed.researchAreas : [],
      studyAbroadOptions: Array.isArray(parsed.studyAbroadOptions) ? parsed.studyAbroadOptions : [],
      clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
      relatedMajors: Array.isArray(parsed.relatedMajors) ? parsed.relatedMajors : [],
      commonMinors: Array.isArray(parsed.commonMinors) ? parsed.commonMinors : [],
      dualDegreeOptions: Array.isArray(parsed.dualDegreeOptions) ? parsed.dualDegreeOptions : [],
      departmentWebsite: parsed.departmentWebsite,
      advisingContact: parsed.advisingContact,
      links: Array.isArray(parsed.links) ? parsed.links : []
    };

    return {
      success: true,
      message: 'Major data enriched successfully',
      majorData,
      rawText: aiResult.rawText,
      requestId: aiResult.requestId ?? undefined
    };
  } catch (err) {
    console.error('EnrichMajorData_ServerAction error:', err);
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

// ----------------------------------------------
// Chatbot: send a message and get AI reply with session grouping
// ----------------------------------------------
/**
 * Handles a single chatbot message. Adds guardrails: if message is not about
 * academic, career, or student concerns, return a standard guidance response.
 * Logs the exchange in ai_responses with a provided session_id.
 */
export async function ChatbotSendMessage_ServerAction(args: {
  message: string;
  sessionId?: string;
  model?: string;
}): Promise<{ success: boolean; reply: string; sessionId: string; requestId?: string; error?: string }>{
  try {
    const user = await getVerifiedUser(); // may be null if not required; leaving as requirement aligns with RLS
    if (!user) return { success: false, reply: '', sessionId: args.sessionId || '', error: 'User not authenticated' };

    const sessionId = args.sessionId && args.sessionId.trim() ? args.sessionId : `sess_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const userMessage = (args.message || '').trim();
    if (!userMessage) return { success: false, reply: '', sessionId, error: 'Empty message' };

    // Guardrailed prompt with JSON output to simplify handling
    const systemInstruction = `You are a helpful university student assistant.
If the user's message is about academic planning, courses, degree requirements, scheduling, registration, financial aid, student support, career pathways, internships, or campus resources, provide a concise, helpful answer.
If the message is NOT related to academic, career, or student concerns, respond with this exact standard message:
"I can help with academic, career, or student life questions. For other topics, please reach out to your advisor or campus support resources."
Return valid JSON only with shape: { "reply": string, "category": "student" | "non-student" }.`;

    const prompt = `${systemInstruction}\n\nUSER_MESSAGE:\n${userMessage}\n\nReturn JSON now.`;
    const aiResult = await executeJsonPrompt({ prompt_name: 'chatbot_message', prompt, model: args.model || 'gpt-5-mini', max_output_tokens: 1200 });

    const fallback = 'I can help with academic, career, or student life questions. For other topics, please reach out to your advisor or campus support resources.';
    const reply = aiResult.success && aiResult.parsedJson && typeof (aiResult.parsedJson as any).reply === 'string'
      ? String((aiResult.parsedJson as any).reply)
      : (aiResult.rawText || fallback);

    // Log to ai_responses with session_id
    try {
      await InsertAiChatExchange({
        userId: user.id,
        sessionId,
        userMessage,
        aiResponse: reply,
        outputTokens: aiResult.usage?.completion_tokens || 0,
      });
    } catch (logErr) {
      console.error('Failed to insert chat exchange:', logErr);
    }

    return { success: true, reply, sessionId, requestId: aiResult.requestId ?? undefined };
  } catch (err) {
    return { success: false, reply: '', sessionId: args.sessionId || '', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

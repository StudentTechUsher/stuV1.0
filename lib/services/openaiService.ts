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

// Typed structures for parsed AI responses
interface CoursesDataInput {
  programs?: unknown;
  generalEducation?: unknown;
  selectionMode?: 'AUTO' | 'MANUAL' | 'CHOICE';
  selectedPrograms?: Array<string | number>;
  takenCourses?: Array<{
    code: string;
    title: string;
    credits: number;
    term: string;
    grade: string;
    status: string;
    source: string;
  }>;
}

interface CareerOption {
  id: string;
  title: string;
  rationale: string;
}

interface CareerSuggestionsResponse {
  options: CareerOption[];
  message?: string;
}

interface MajorRecommendation {
  code: string;
  name: string;
  rationale: string;
}

interface MajorRecommendationsResponse {
  majors: MajorRecommendation[];
  message?: string;
}

interface MinorAuditResult {
  id: string;
  name: string;
  reason: string;
  rationale?: string;
}

interface MinorAuditResponse {
  minors: MinorAuditResult[];
  message?: string;
}

interface ChatbotResponse {
  reply: string;
  category?: 'student' | 'non-student';
  confidence?: number; // 0-100 scale, represents how confident the AI is in helping the user
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
    const cd = coursesData as CoursesDataInput;
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
      userId: user.id,
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

    const parsed = aiResult.parsedJson as CareerSuggestionsResponse;
    if (!parsed || !Array.isArray(parsed.options)) {
      const reqId = aiResult.requestId ?? undefined;
      return { success: false, message: 'Model returned unexpected shape', rawText: aiResult.rawText, requestId: reqId };
    }

    // Simple post-validate and normalize
    const options = parsed.options
      .slice(0, 5)
      .map((o) => {
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
    const parsed = aiResult.parsedJson as CareerSuggestionsResponse;
    if (!parsed || !Array.isArray(parsed.options)) {
      return { success: false, message: 'Model returned unexpected shape', rawText: aiResult.rawText, requestId: aiResult.requestId ?? undefined };
    }

    const options = parsed.options.slice(0,5).map((o) => {
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

    const { careerTitle, slug: _slug, rationale, studentContext } = args;

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

    interface EnrichCareerResponse {
      education?: { typicalLevel?: string; certifications?: string[] };
      bestMajors?: Array<{ id?: string; name?: string }>;
      locationHubs?: string[];
      salaryUSD?: { entry?: number; median?: number; p90?: number; source?: string };
      outlook?: { growthLabel?: string; notes?: string; source?: string };
      topSkills?: string[];
      dayToDay?: string[];
      recommendedCourses?: string[];
      internships?: string[];
      clubs?: string[];
      relatedCareers?: string[];
      links?: Array<{ label?: string; url?: string }>;
    }

    const parsed = aiResult.parsedJson as EnrichCareerResponse;
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
      bestMajors: Array.isArray(parsed.bestMajors)
        ? parsed.bestMajors
            .filter((major): major is { id?: string; name?: string } => !!major && typeof major === 'object')
            .map((major, index) => ({
              id: typeof major.id === 'string' && major.id.trim() !== '' ? major.id : `major-${index + 1}`,
              name: typeof major.name === 'string' && major.name.trim() !== '' ? major.name : 'Pending Major Name',
            }))
        : [],
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
      links: Array.isArray(parsed.links)
        ? parsed.links
            .filter((link): link is { label?: string; url?: string } => !!link && typeof link === 'object' && typeof link.url === 'string' && link.url.trim() !== '')
            .map((link, index) => ({
              label: typeof link.label === 'string' && link.label.trim() !== '' ? link.label : `Resource ${index + 1}`,
              url: link.url!,
            }))
        : []
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

    const { majorName, slug: _slug, rationale, studentContext, universityName } = args;

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

    interface EnrichMajorResponse {
      degreeType?: string;
      shortOverview?: string;
      overview?: string;
      topCareers?: Array<{ slug?: string; title?: string }>;
      careerOutlook?: string;
      totalCredits?: number;
      typicalDuration?: string;
      coreCourses?: string[];
      electiveCourses?: string[];
      courseEquivalencies?: Array<{ institutionCourse?: string; equivalentCourses?: string[]; notes?: string }>;
      prerequisites?: string[];
      mathRequirements?: string;
      otherRequirements?: string;
      topSkills?: string[];
      learningOutcomes?: string[];
      internshipOpportunities?: string[];
      researchAreas?: string[];
      studyAbroadOptions?: string[];
      clubs?: string[];
      relatedMajors?: string[];
      commonMinors?: string[];
      dualDegreeOptions?: string[];
      departmentWebsite?: string;
      advisingContact?: string;
      links?: Array<{ label?: string; url?: string }>;
    }

    const parsed = aiResult.parsedJson as EnrichMajorResponse;
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
      degreeType: typeof parsed.degreeType === 'string' ? parsed.degreeType : 'BS',
      shortOverview: typeof parsed.shortOverview === 'string' ? parsed.shortOverview : '',
      overview: typeof parsed.overview === 'string' ? parsed.overview : '',
      topCareers: Array.isArray(parsed.topCareers)
        ? parsed.topCareers
            .filter((career): career is { slug?: string; title?: string } => !!career && typeof career === 'object')
            .map((career, index) => ({
              slug: typeof career.slug === 'string' && career.slug.trim() !== '' ? career.slug : `career-${index + 1}`,
              title: typeof career.title === 'string' && career.title.trim() !== '' ? career.title : 'Pending Career Title',
            }))
        : [],
      careerOutlook: typeof parsed.careerOutlook === 'string' ? parsed.careerOutlook : '',
      totalCredits: typeof parsed.totalCredits === 'number' ? parsed.totalCredits : 120,
      typicalDuration: typeof parsed.typicalDuration === 'string' ? parsed.typicalDuration : '4 years',
      coreCourses: Array.isArray(parsed.coreCourses)
        ? parsed.coreCourses.filter((course): course is string => typeof course === 'string')
        : [],
      electiveCourses: Array.isArray(parsed.electiveCourses)
        ? parsed.electiveCourses.filter((course): course is string => typeof course === 'string')
        : [],
      courseEquivalencies: Array.isArray(parsed.courseEquivalencies)
        ? parsed.courseEquivalencies
            .filter((course): course is { institutionCourse?: string; equivalentCourses?: string[]; notes?: string } => !!course && typeof course === 'object')
            .map((course, index) => ({
              institutionCourse:
                typeof course.institutionCourse === 'string' && course.institutionCourse.trim() !== ''
                  ? course.institutionCourse
                  : `Course ${index + 1}`,
              equivalentCourses: Array.isArray(course.equivalentCourses)
                ? course.equivalentCourses.filter((eq): eq is string => typeof eq === 'string' && eq.trim() !== '')
                : [],
              ...(typeof course.notes === 'string' && course.notes.trim() !== '' ? { notes: course.notes } : {}),
            }))
        : [],
      prerequisites: Array.isArray(parsed.prerequisites)
        ? parsed.prerequisites.filter((item): item is string => typeof item === 'string')
        : [],
      mathRequirements: typeof parsed.mathRequirements === 'string' ? parsed.mathRequirements : undefined,
      otherRequirements: typeof parsed.otherRequirements === 'string' ? parsed.otherRequirements : undefined,
      topSkills: Array.isArray(parsed.topSkills)
        ? parsed.topSkills.filter((skill): skill is string => typeof skill === 'string')
        : [],
      learningOutcomes: Array.isArray(parsed.learningOutcomes)
        ? parsed.learningOutcomes.filter((outcome): outcome is string => typeof outcome === 'string')
        : [],
      internshipOpportunities: Array.isArray(parsed.internshipOpportunities)
        ? parsed.internshipOpportunities.filter((item): item is string => typeof item === 'string')
        : [],
      researchAreas: Array.isArray(parsed.researchAreas)
        ? parsed.researchAreas.filter((area): area is string => typeof area === 'string')
        : [],
      studyAbroadOptions: Array.isArray(parsed.studyAbroadOptions)
        ? parsed.studyAbroadOptions.filter((option): option is string => typeof option === 'string')
        : [],
      clubs: Array.isArray(parsed.clubs)
        ? parsed.clubs.filter((club): club is string => typeof club === 'string')
        : [],
      relatedMajors: Array.isArray(parsed.relatedMajors)
        ? parsed.relatedMajors.filter((major): major is string => typeof major === 'string')
        : [],
      commonMinors: Array.isArray(parsed.commonMinors)
        ? parsed.commonMinors.filter((minor): minor is string => typeof minor === 'string')
        : [],
      dualDegreeOptions: Array.isArray(parsed.dualDegreeOptions)
        ? parsed.dualDegreeOptions.filter((option): option is string => typeof option === 'string')
        : [],
      departmentWebsite: typeof parsed.departmentWebsite === 'string' ? parsed.departmentWebsite : undefined,
      advisingContact: typeof parsed.advisingContact === 'string' ? parsed.advisingContact : undefined,
      links: Array.isArray(parsed.links)
        ? parsed.links
            .filter((link): link is { label?: string; url?: string } => !!link && typeof link === 'object' && typeof link.url === 'string' && link.url.trim() !== '')
            .map((link, index) => ({
              label: typeof link.label === 'string' && link.label.trim() !== '' ? link.label : `Resource ${index + 1}`,
              url: link.url!,
            }))
        : []
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
          .map((m) => {
            if (m && typeof m === 'object' && 'name' in m && typeof m.name === 'string') {
              return m.name.trim();
            }
            return undefined;
          })
          .filter((name): name is string => Boolean(name))
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

    const parsed = aiResult.parsedJson as MajorRecommendationsResponse;
    if (!parsed || !Array.isArray(parsed.majors)) {
      return { success: false, message: 'Model returned unexpected shape (majors missing)', rawText: aiResult.rawText, requestId: aiResult.requestId ?? undefined };
    }

    const majors = parsed.majors.slice(0, 3).map((m) => {
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
    const parsed = aiResult.parsedJson as MinorAuditResponse;
    const outMinors: Array<{ id: string; name: string; reason: string }> = Array.isArray(parsed?.minors)
      ? parsed.minors.map((m) => {
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
}): Promise<{ success: boolean; reply: string; sessionId: string; confidence?: number; requestId?: string; error?: string }>{
  try {
    const user = await getVerifiedUser(); // may be null if not required; leaving as requirement aligns with RLS
    if (!user) return { success: false, reply: '', sessionId: args.sessionId || '', error: 'User not authenticated' };

    const sessionId = args.sessionId && args.sessionId.trim() ? args.sessionId : `sess_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const userMessage = (args.message || '').trim();
    if (!userMessage) return { success: false, reply: '', sessionId, error: 'Empty message' };

    // Guardrailed prompt with JSON output to simplify handling - now includes confidence rating
    const systemInstruction = `You are a helpful university student assistant.
If the user's message is about academic planning, courses, degree requirements, scheduling, registration, financial aid, student support, career pathways, internships, or campus resources, provide a concise, helpful answer.
If the message is NOT related to academic, career, or student concerns, respond with this exact standard message:
"I can help with academic, career, or student life questions. For other topics, please reach out to your advisor or campus support resources."

Additionally, include a confidence rating (0-100) indicating how well you can help with this specific question:
- 90-100: You have comprehensive, accurate information and can provide excellent guidance
- 70-89: You can provide helpful information but may lack some specific details
- 50-69: You can provide general guidance but the user may benefit from speaking to an advisor
- 0-49: This is outside your expertise or requires human advisor assistance

Return valid JSON only with shape: { "reply": string, "category": "student" | "non-student", "confidence": number }.`;

    const prompt = `${systemInstruction}\n\nUSER_MESSAGE:\n${userMessage}\n\nReturn JSON now.`;
    const aiResult = await executeJsonPrompt({ prompt_name: 'chatbot_message', prompt, model: args.model || 'gpt-5-mini', max_output_tokens: 1200 });

    const fallback = 'I can help with academic, career, or student life questions. For other topics, please reach out to your advisor or campus support resources.';
    const parsedResponse = aiResult.parsedJson as ChatbotResponse;
    const reply = aiResult.success && parsedResponse && typeof parsedResponse.reply === 'string'
      ? String(parsedResponse.reply)
      : (aiResult.rawText || fallback);

    // Extract confidence rating (default to 50 if not provided)
    const confidence = typeof parsedResponse?.confidence === 'number'
      ? Math.max(0, Math.min(100, parsedResponse.confidence)) // Clamp between 0-100
      : 50;

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

    return { success: true, reply, sessionId, confidence, requestId: aiResult.requestId ?? undefined };
  } catch (err) {
    return { success: false, reply: '', sessionId: args.sessionId || '', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Custom error types for chat completion
export class OpenAIChatError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'OpenAIChatError';
  }
}

export class TranscriptParsingError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'TranscriptParsingError';
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ParsedTranscriptCourse {
  courseCode: string;
  title: string;
  credits: number;
  grade: string | null;
  term?: string | null; // Term like "Fall Semester 2023", "Winter Semester 2024"
  section?: string | null; // Section number like "001", "030"
  professor?: string | null; // Professor name if available
  tags?: string[]; // Program requirement tags (e.g., "General Education - Mathematics", "CS Major - Core")
}

/**
 * Helper function to transform ParsedTranscriptCourse to ParsedCourse format
 * Splits courseCode into subject and number, uses term from AI or defaults to "Unknown"
 */
function transformTranscriptCoursesToParsedCourses(
  courses: ParsedTranscriptCourse[]
): Array<{ term: string; subject: string; number: string; title: string; credits: number; grade: string | null; tags?: string[] }> {
  return courses.map((course) => {
    // Split courseCode into subject and number (e.g., "CS 142" -> subject: "CS", number: "142")
    const codeParts = course.courseCode.trim().split(/\s+/);
    const subject = codeParts[0] || 'UNKNOWN';
    const number = codeParts[1] || '000';

    return {
      term: course.term || 'Unknown',
      subject,
      number,
      title: course.title,
      credits: course.credits,
      grade: course.grade,
      tags: course.tags || [],
    };
  });
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Simple OpenAI chat completion for general chat functionality
 * @param messages - Array of chat messages
 * @param options - Optional parameters (max_tokens, temperature)
 * @returns Chat completion response
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { max_tokens?: number; temperature?: number }
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new OpenAIChatError('OpenAI API key not configured');
    }

    const { max_tokens: maxTokens = 500, temperature = 0.7 } = options || {};

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using GPT-4o-mini for better performance and larger context
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new OpenAIChatError(`OpenAI request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || 'No response generated',
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof OpenAIChatError) {
      throw error;
    }
    throw new OpenAIChatError('Unexpected error in chat completion', error);
  }
}

/**
 * Helper to recursively extract all course codes from program requirements
 */
function extractCourseCodes(requirements: unknown): string[] {
  const codes: string[] = [];

  if (!requirements || typeof requirements !== 'object') {
    return codes;
  }

  const req = requirements as Record<string, unknown>;

  // Extract from programRequirements array
  if (Array.isArray(req.programRequirements)) {
    req.programRequirements.forEach((item: unknown) => {
      codes.push(...extractCourseCodesFromRequirement(item));
    });
  }

  return codes;
}

/**
 * Helper to extract course codes from a single requirement (recursive)
 */
function extractCourseCodesFromRequirement(requirement: unknown): string[] {
  const codes: string[] = [];

  if (!requirement || typeof requirement !== 'object') {
    return codes;
  }

  const req = requirement as Record<string, unknown>;

  // Extract from courses array
  if (Array.isArray(req.courses)) {
    req.courses.forEach((course: unknown) => {
      if (course && typeof course === 'object' && 'code' in course && typeof course.code === 'string') {
        codes.push(course.code);
      }
    });
  }

  // Extract from subRequirements/subrequirements
  const subReqs = req.subRequirements ?? req.subrequirements;
  if (Array.isArray(subReqs)) {
    subReqs.forEach((subReq: unknown) => {
      codes.push(...extractCourseCodesFromRequirement(subReq));
    });
  }

  // Extract from options (for optionGroup type)
  if (Array.isArray(req.options)) {
    req.options.forEach((option: unknown) => {
      if (option && typeof option === 'object' && 'requirements' in option && Array.isArray(option.requirements)) {
        option.requirements.forEach((optReq: unknown) => {
          codes.push(...extractCourseCodesFromRequirement(optReq));
        });
      }
    });
  }

  // Extract from sequence
  if (Array.isArray(req.sequence)) {
    req.sequence.forEach((seqItem: unknown) => {
      if (seqItem && typeof seqItem === 'object' && 'courses' in seqItem && Array.isArray(seqItem.courses)) {
        seqItem.courses.forEach((course: unknown) => {
          if (course && typeof course === 'object' && 'code' in course && typeof course.code === 'string') {
            codes.push(course.code);
          }
        });
      }
    });
  }

  return codes;
}

/**
 * Helper function to fetch user's program context for transcript tagging
 * Fetches Gen Ed requirements and user's active programs (majors/minors)
 */
async function fetchUserProgramContext(userId: string): Promise<{
  genEdPrograms: Array<{ id: string; name: string; courseCodes: string[] }>;
  userPrograms: Array<{ id: string; name: string; program_type: string; courseCodes: string[] }>;
  universityId: number | null;
}> {
  try {
    // Import services dynamically to avoid circular dependencies
    const { getUserUniversityId } = await import('./profileService');
    const { GetActiveGradPlan } = await import('./gradPlanService');
    const { GetGenEdsForUniversity, fetchProgramsBatch } = await import('./programService');

    // 1. Get user's university
    let universityId: number | null = null;
    try {
      universityId = await getUserUniversityId(userId);
    } catch (error) {
      console.warn('Could not fetch university for user:', userId, error);
    }

    // 2. Get General Education programs for the university
    let genEdPrograms: Array<{ id: string; name: string; courseCodes: string[] }> = [];
    if (universityId) {
      try {
        const genEds = await GetGenEdsForUniversity(universityId);
        genEdPrograms = genEds.map((p) => ({
          id: p.id,
          name: p.name,
          courseCodes: extractCourseCodes(p.requirements),
        }));
      } catch (error) {
        console.warn('Could not fetch Gen Ed programs:', error);
      }
    }

    // 3. Get user's active grad plan to find their programs
    let userPrograms: Array<{ id: string; name: string; program_type: string; courseCodes: string[] }> = [];
    try {
      const activePlan = await GetActiveGradPlan(userId);
      if (activePlan && activePlan.programs_in_plan && Array.isArray(activePlan.programs_in_plan)) {
        const programIds = activePlan.programs_in_plan;
        if (programIds.length > 0) {
          const programs = await fetchProgramsBatch(programIds.map(String), universityId ?? undefined);
          userPrograms = programs.map((p) => ({
            id: p.id,
            name: p.name,
            program_type: p.program_type,
            courseCodes: extractCourseCodes(p.requirements),
          }));
        }
      }
    } catch (error) {
      console.warn('Could not fetch user programs:', error);
    }

    return { genEdPrograms, userPrograms, universityId };
  } catch (error) {
    console.error('Error fetching user program context:', error);
    return { genEdPrograms: [], userPrograms: [], universityId: null };
  }
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Parse transcript text into structured course data using AI
 * Saves the prompt and response to the database for analytics
 * @param transcriptText - The extracted text from the transcript PDF
 * @param userId - The user ID (optional, for database logging)
 * @param sessionId - The session ID for grouping related AI calls
 * @returns Array of parsed courses with courseCode, title, credits, and grade
 */
export async function parseTranscriptCourses_ServerAction(args: {
  transcriptText: string;
  userId?: string | null;
  sessionId?: string;
}): Promise<{
  success: boolean;
  courses?: ParsedTranscriptCourse[];
  isPartial?: boolean;
  savedToDb?: boolean;
  error?: string;
  sessionId: string;
}> {
  try {
    const { transcriptText, userId = null, sessionId: providedSessionId } = args;

    // Generate session ID if not provided
    const sessionId = providedSessionId || `transcript_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Validate input
    if (!transcriptText || transcriptText.trim().length === 0) {
      return {
        success: false,
        error: 'Transcript text is required',
        sessionId,
      };
    }

    // Fetch user's program context if userId is provided
    let programContext: {
      genEdPrograms: Array<{ id: string; name: string; courseCodes: string[] }>;
      userPrograms: Array<{ id: string; name: string; program_type: string; courseCodes: string[] }>;
      universityId: number | null;
    } = { genEdPrograms: [], userPrograms: [], universityId: null };
    if (userId) {
      programContext = await fetchUserProgramContext(userId);
    }

    // Build program context string for the AI
    let _programContextStr = '';
    const hasPrograms = programContext.genEdPrograms.length > 0 || programContext.userPrograms.length > 0;

    if (hasPrograms) {
      _programContextStr = '\n\nSTUDENT PROGRAM CONTEXT:\n';

      if (programContext.genEdPrograms.length > 0) {
        _programContextStr += '\nGeneral Education Programs:\n';
        programContext.genEdPrograms.forEach((prog) => {
          _programContextStr += `- ${prog.name}`;
          if (prog.courseCodes.length > 0) {
            // Limit course codes to prevent context overflow
            const codes = prog.courseCodes.slice(0, 100); // Limit to first 100 courses
            _programContextStr += `\n  Required courses: ${codes.join(', ')}`;
            if (prog.courseCodes.length > 100) {
              _programContextStr += ` ... (${prog.courseCodes.length - 100} more)`;
            }
          }
          _programContextStr += '\n';
        });
      }

      if (programContext.userPrograms.length > 0) {
        _programContextStr += '\nStudent\'s Programs (Majors/Minors):\n';
        programContext.userPrograms.forEach((prog) => {
          _programContextStr += `- ${prog.name} (${prog.program_type})`;
          if (prog.courseCodes.length > 0) {
            // Limit course codes to prevent context overflow
            const codes = prog.courseCodes.slice(0, 100); // Limit to first 100 courses
            _programContextStr += `\n  Required courses: ${codes.join(', ')}`;
            if (prog.courseCodes.length > 100) {
              _programContextStr += ` ... (${prog.courseCodes.length - 100} more)`;
            }
          }
          _programContextStr += '\n';
        });
      }
    }

    // Build prompt for GPT-5-mini with BYU-specific formatting rules
    const prompt =
      'You are parsing a BYU transcript. Extract course information and return ONLY valid JSON (no markdown code blocks). ' +
      'Return an array of course objects with these exact fields:\n' +
      '- courseCode: string in format "SUBJECT NUMBER" (e.g., "HIST 202", "REL A 275", "IS 201")\n' +
      '- title: string (full course title)\n' +
      '- credits: number (e.g., 3.00, 1.50, 0.50)\n' +
      '- grade: string or null (e.g., "A", "B+", "A-", "P" or null if not shown)\n' +
      '- term: string or null (e.g., "Fall Semester 2023", "Winter Semester 2024", "Spring 2024")\n' +
      '- section: string or null (e.g., "001", "030" - the 3-digit section number)\n' +
      '- professor: string or null (professor name if it appears on transcript)\n' +
      '- tags: empty array []\n\n' +
      'PARSING ALGORITHM (follow exactly):\n' +
      '1. Look for the course title (long text description)\n' +
      '2. Everything BEFORE the title contains: SUBJECT + NUMBER + SECTION\n' +
      '3. Find all tokens before the title\n' +
      '4. The LAST numeric token before title is the SECTION (3 digits) - SAVE this as "section" field\n' +
      '5. The SECOND-TO-LAST numeric token is the course NUMBER (e.g., 202, 275, 100, 490R)\n' +
      '6. Everything before the NUMBER is the SUBJECT (can have spaces)\n' +
      '7. courseCode = SUBJECT + " " + NUMBER\n' +
      '8. Look for professor names (often appear near course info or at end of line)\n' +
      '9. Look for term/semester info (often at start of sections like "Fall Semester 2023")\n\n' +
      'WORKED EXAMPLES:\n\n' +
      'Example 1: "REL C 225 030 Foundations of the Restoration 2.00 A"\n' +
      'Tokens before title: ["REL", "C", "225", "030"]\n' +
      'SECTION (last numeric): "030" → section: "030"\n' +
      'NUMBER (second-to-last numeric): "225"\n' +
      'SUBJECT (everything before NUMBER): "REL C"\n' +
      'courseCode: "REL C 225" ✓, section: "030" ✓\n\n' +
      'Example 2: "HIST 202 001 World Civilization from 1500 3.00 B+ Dr. Smith"\n' +
      'Tokens before title: ["HIST", "202", "001"]\n' +
      'SECTION: "001" → section: "001"\n' +
      'NUMBER: "202"\n' +
      'SUBJECT: "HIST"\n' +
      'PROFESSOR: "Dr. Smith" (appears after grade)\n' +
      'courseCode: "HIST 202" ✓, section: "001" ✓, professor: "Dr. Smith" ✓\n\n' +
      'Example 3: "M COM 320 004 Management Communication 3.00 A-"\n' +
      'Tokens before title: ["M", "COM", "320", "004"]\n' +
      'SECTION: "004" → section: "004"\n' +
      'NUMBER: "320"\n' +
      'SUBJECT: "M COM"\n' +
      'courseCode: "M COM 320" ✓, section: "004" ✓\n\n' +
      'Example 4: "ENT 490R 009 Topics in Entrepreneurship 3.00 A Johnson, Michael"\n' +
      'Tokens before title: ["ENT", "490R", "009"]\n' +
      'SECTION: "009" → section: "009"\n' +
      'NUMBER: "490R"\n' +
      'SUBJECT: "ENT"\n' +
      'PROFESSOR: "Johnson, Michael"\n' +
      'courseCode: "ENT 490R" ✓, section: "009" ✓, professor: "Johnson, Michael" ✓\n\n' +
      'Extract all courses from this transcript:\n\n' +
      transcriptText +
      '\n\nIMPORTANT: The courseCode MUST include both subject AND number. "REL C" alone is WRONG - it must be "REL C 225".';

    console.log('📏 Transcript text length:', transcriptText.length);

    // Call OpenAI via executeJsonPrompt with GPT-5-mini
    const aiResult = await executeJsonPrompt({
      prompt_name: 'parse_transcript_courses',
      prompt,
      model: 'gpt-5-mini',
      max_output_tokens: 16000, // GPT-5-mini supports larger output
    });

    if (!aiResult.success || !aiResult.rawText) {
      console.error('❌ AI parsing failed:', aiResult.message);
      return {
        success: false,
        error: aiResult.message || 'Failed to parse transcript',
        sessionId,
      };
    }

    const aiResponse = aiResult.rawText;
    const outputTokens = 0; // executeJsonPrompt doesn't return token counts in the same way

    // Save to database
    let savedToDb = false;
    try {
      const saveResult = await InsertAiChatExchange({
        userId,
        sessionId,
        userMessage: prompt.substring(0, 500) + '...', // Truncate for DB
        aiResponse,
        outputTokens,
      });

      if (saveResult.success) {
        savedToDb = true;
        console.log('✅ Transcript parsing saved to database:', {
          sessionId,
          userId: userId || 'anonymous',
        });
      } else {
        console.error('❌ Failed to save to database:', saveResult.error);
      }
    } catch (dbError) {
      console.error('❌ Exception while saving transcript parsing to database:', dbError);
      // Don't fail the entire operation if DB save fails
    }

    // Parse the response
    const { courses, isPartial } = extractCoursesFromResponse(aiResponse);

    // Build a whitelist of valid program names
    const validProgramNames = new Set<string>();
    if (hasPrograms) {
      programContext.genEdPrograms.forEach(prog => validProgramNames.add(prog.name));
      programContext.userPrograms.forEach(prog => validProgramNames.add(prog.name));
    }

    // Filter out invalid tags from AI response
    const cleanedCourses = courses.map(course => {
      if (!course.tags || course.tags.length === 0) {
        return course;
      }

      // Only keep tags that exactly match valid program names
      const validTags = course.tags.filter(tag => validProgramNames.has(tag));

      // Log if we removed any invalid tags
      const removedTags = course.tags.filter(tag => !validProgramNames.has(tag));
      if (removedTags.length > 0) {
        console.warn(`🧹 Removed invalid tags from ${course.courseCode}:`, removedTags);
      }

      return {
        ...course,
        tags: validTags,
      };
    });

    console.log('✅ Transcript parsing complete:', {
      coursesFound: cleanedCourses.length,
      isPartial,
      savedToDb,
      outputTokens,
      validProgramNames: Array.from(validProgramNames),
    });

    // Warn if response might be truncated
    if (outputTokens >= 7500) {
      console.warn('⚠️ Response approaching token limit - may be truncated. Consider processing transcript in smaller chunks.');
    }

    // Save courses to user_courses table if userId is provided
    let savedCourses = false;
    if (userId && cleanedCourses.length > 0) {
      try {
        const { createSupabaseServerComponentClient } = await import('@/lib/supabase/server');
        const { upsertUserCourses } = await import('./userCoursesService');
        const supabase = await createSupabaseServerComponentClient();
        const parsedCourses = transformTranscriptCoursesToParsedCourses(cleanedCourses);

        const upsertResult = await upsertUserCourses(supabase, userId, parsedCourses);
        if (upsertResult.success) {
          savedCourses = true;
          console.log('✅ Courses saved to user_courses table:', {
            userId,
            courseCount: upsertResult.courseCount,
          });
        } else {
          console.error('❌ Failed to save courses to user_courses table');
        }
      } catch (saveError) {
        console.error('❌ Exception while saving courses to user_courses table:', saveError);
        // Don't fail the entire operation if course save fails
      }
    }

    return {
      success: true,
      courses: cleanedCourses,
      isPartial,
      savedToDb: savedToDb && savedCourses,
      sessionId,
    };
  } catch (error) {
    console.error('parseTranscriptCourses_ServerAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse transcript',
      sessionId: args.sessionId || `transcript_error_${Date.now()}`,
    };
  }
}

/**
 * Helper function to extract courses from AI response
 * Handles various JSON formats and validates course structure
 * Returns courses and a flag indicating if response was partial/truncated
 */
function extractCoursesFromResponse(content: string): { courses: ParsedTranscriptCourse[]; isPartial: boolean } {
  const { data: parsed, isPartial } = parseJsonPayload(content);

  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).courses)
    ? (parsed as Record<string, unknown>).courses
    : null;

  if (!items) {
    throw new TranscriptParsingError('AI response did not contain a course list');
  }

  const courses: ParsedTranscriptCourse[] = [];
  for (const item of items as unknown[]) {
    const normalized = normalizeCourseRecord(item);
    if (normalized) {
      courses.push(normalized);
    }
  }

  return { courses, isPartial };
}

/**
 * Helper function to repair truncated JSON arrays
 * Removes incomplete last element and closes the array properly
 */
function repairTruncatedArray(jsonStr: string): string {
  let depth = 0;
  let lastCompleteIndex = -1;

  for (let i = 0; i < jsonStr.length; i++) {
    if (jsonStr[i] === '{') depth++;
    if (jsonStr[i] === '}') {
      depth--;
      if (depth === 1) lastCompleteIndex = i; // Mark last complete object in array
    }
  }

  if (lastCompleteIndex > 0) {
    // Truncate after last complete object and close array
    return jsonStr.substring(0, lastCompleteIndex + 1) + '\n]';
  }

  return jsonStr;
}

/**
 * Helper function to parse JSON from AI response
 * Handles markdown code blocks, extracts JSON, and repairs truncated responses
 */
function parseJsonPayload(rawContent: string): { data: unknown; isPartial: boolean } {
  const sanitized = rawContent
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  // Try normal parsing first
  const direct = tryJsonParse(sanitized);
  if (direct.success) {
    return { data: direct.value, isPartial: false };
  }

  // Try to extract complete array
  const arrayMatch = sanitized.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const attempt = tryJsonParse(arrayMatch[0]);
    if (attempt.success) {
      return { data: attempt.value, isPartial: false };
    }
  }

  // Try to repair truncated array (handles incomplete responses)
  const truncatedArrayMatch = sanitized.match(/\[[\s\S]*/);
  if (truncatedArrayMatch) {
    const repaired = repairTruncatedArray(truncatedArrayMatch[0]);
    const attempt = tryJsonParse(repaired);
    if (attempt.success) {
      console.warn('AI response was truncated - returning partial results');
      return { data: attempt.value, isPartial: true };
    }
  }

  // Try complete object as fallback
  const objectMatch = sanitized.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const attempt = tryJsonParse(objectMatch[0]);
    if (attempt.success) {
      return { data: attempt.value, isPartial: false };
    }
  }

  console.error('Failed to parse JSON from AI response:', { rawContent });
  throw new TranscriptParsingError('AI response was not valid JSON');
}

/**
 * Helper function to safely parse JSON
 */
function tryJsonParse(payload: string): { success: true; value: unknown } | { success: false } {
  if (!payload) {
    return { success: false };
  }

  try {
    const value = JSON.parse(payload);
    return { success: true, value };
  } catch (_error) {
    return { success: false };
  }
}

/**
 * Helper function to normalize and validate a course record
 */
function normalizeCourseRecord(record: unknown): ParsedTranscriptCourse | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const raw = record as Record<string, unknown>;
  const courseCodeValue = raw.courseCode ?? raw.code ?? raw.course ?? null;
  const titleValue = raw.title ?? raw.name ?? raw.description ?? null;
  const creditsValue = raw.credits ?? raw.creditHours ?? raw.credit ?? null;
  const gradeValue = raw.grade ?? null;
  const termValue = raw.term ?? raw.semester ?? null;
  const sectionValue = raw.section ?? null;
  const professorValue = raw.professor ?? raw.instructor ?? null;
  const tagsValue = raw.tags ?? null;

  if (typeof courseCodeValue !== 'string' || !courseCodeValue.trim()) {
    console.warn('Skipping AI course with missing courseCode', record);
    return null;
  }

  if (typeof titleValue !== 'string' || !titleValue.trim()) {
    console.warn('Skipping AI course with missing title', record);
    return null;
  }

  let credits = typeof creditsValue === 'number' ? creditsValue : Number(creditsValue);
  if (!Number.isFinite(credits)) {
    console.warn('Skipping AI course with invalid credits', record);
    return null;
  }

  credits = Number(credits.toFixed(2));

  const normalizedGrade =
    gradeValue === null || gradeValue === undefined || gradeValue === ''
      ? null
      : String(gradeValue).trim();

  const normalizedTerm =
    termValue === null || termValue === undefined || termValue === ''
      ? null
      : String(termValue).trim();

  const normalizedSection =
    sectionValue === null || sectionValue === undefined || sectionValue === ''
      ? null
      : String(sectionValue).trim();

  const normalizedProfessor =
    professorValue === null || professorValue === undefined || professorValue === ''
      ? null
      : String(professorValue).trim();

  // Normalize tags - ensure it's an array of strings
  let normalizedTags: string[] = [];
  if (Array.isArray(tagsValue)) {
    normalizedTags = tagsValue
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter((tag): tag is string => Boolean(tag));
  }

  return {
    courseCode: courseCodeValue.trim(),
    title: titleValue.trim(),
    credits,
    grade: normalizedGrade,
    term: normalizedTerm,
    section: normalizedSection,
    professor: normalizedProfessor,
    tags: normalizedTags,
  };
}

/**
 * Chat completion with function calling (tools) support
 * Used for the career pathfinder conversation
 */
interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionWithToolsResponse {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE (called from chatbot routes)
 * Chat completion with optional function calling (tools) support
 * @param messages - Array of chat messages
 * @param tools - Optional array of tools/functions the AI can call
 * @param options - Optional parameters (max_tokens, temperature)
 * @returns Chat completion response with potential tool calls
 */
export async function chatCompletionWithTools(
  messages: OpenAIChatMessage[],
  tools?: OpenAITool[],
  options?: { max_tokens?: number; temperature?: number }
): Promise<ChatCompletionWithToolsResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new OpenAIChatError('OpenAI API key not configured');
    }

    const { max_tokens: maxTokens = 1000, temperature = 0.7 } = options || {};

    const requestBody: Record<string, unknown> = {
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto'; // Let AI decide when to call tools
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new OpenAIChatError(`OpenAI request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
      usage: data.usage,
      finish_reason: choice.finish_reason,
    };
  } catch (error) {
    if (error instanceof OpenAIChatError) {
      throw error;
    }
    throw new OpenAIChatError('Unexpected error in chat completion with tools', error);
  }
}

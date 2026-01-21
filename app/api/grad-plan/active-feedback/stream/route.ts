import { NextRequest } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { GetAiPrompt } from '@/lib/services/aiDbService';

const DEFAULT_ACTIVE_FEEDBACK_PROMPT = `You are an academic advisor AI operating in ACTIVE FEEDBACK mode. Using ONLY the input data (programs/generalEducation or selectedCourses/selectedPrograms, optional takenCourses, suggestedDistribution, workStatus, draftPlan, lockedCourseCodes, lockedTermLabels, and any explicit policy text in input), produce a term-by-term plan.

PHASE: {{PHASE}}

PHASE RULES
- major_skeleton: schedule ONLY major/minor/graduate required courses and prerequisites; do NOT add gen ed or electives; underloaded terms are allowed.
- gen_ed_fill: keep all existing course placements from draftPlan and lockedCourseCodes fixed; add gen ed courses to fill toward target credits.
- elective_balance: keep all locked course placements fixed; fill remaining credits with real catalog electives first, then ELECTIVE placeholders only if needed; lightly rebalance gen ed/electives to smooth loads.

NON-NEGOTIABLE OUTPUT RULES
- Return ONLY JSON matching {{EXAMPLE_STRUCTURE_JSON}} (no extra text).
- Output terms in chronological order.
- Include historical terms first (from takenCourses), unchanged, then planned future terms.

INPUT: TAKEN COURSES (if provided)
- Place takenCourses into historical terms exactly as provided (do not edit course objects, credits, or fulfills).
- A taken course with passing grade or status Completed MUST NOT be scheduled again.
- If catalog text specifies a minimum grade and the taken grade is below it, schedule a retake (the only allowed duplicate).
- In-Progress courses occupy their historical term and MUST NOT be scheduled again.
- Prerequisites are satisfied only by Completed/passing courses (not In-Progress) unless input explicitly allows concurrency.

INPUT: SELECTED COURSES (if provided)
- If selectedCourses/programs include specific selectedCourses per requirement, treat those as locked-in selections.
- Do not swap or invent alternative courses for those requirements.

INPUT: DRAFT PLAN (if provided)
- Treat all existing course placements as locked unless explicitly instructed otherwise.
- Preserve draftPlan term ordering and keep lockedCourseCodes in their current terms.

INPUT: USER INSTRUCTIONS
- userInstructions is a list of global notes; follow them across the plan unless they conflict with hard constraints.
- termInstructions is a map of term labels to notes; apply these only to the specified term.

INPUT: MILESTONES (if provided)
- milestones includes timing or specific term/year; place them as milestone entries in the output plan.
- If draftMilestones is provided, keep them unless a user instruction conflicts.

INPUT: SUGGESTED DISTRIBUTION (if provided)
- suggestedDistribution is an ordered list of terms with term/termType/year and target/min/max credits.
- Use these terms in this exact order.
- For each term, keep total credits within the provided min/max range and prefer targetCredits.
- Do not add or remove terms unless required to fit all required credits. If required, add ONE extra term at the end that follows the same termType pattern, and keep it within the closest matching min/max.

CREDIT LOAD RULES (if suggestedDistribution is NOT provided)
- Primary terms: 12-18 credits (unless strategy guidance below says otherwise).
- If includeSecondaryCourses is true, secondary terms may be 3-9 credits.

STRATEGY GUIDANCE (if creditDistributionStrategy is provided and suggestedDistribution is NOT)
- fast_track: primary 15-18, secondary 6-9
- balanced: primary 12-18, secondary 3-9
- explore: primary 12-15, secondary 3-6

HARD CONSTRAINTS (must follow)
1) Catalog scope / non-invention
- Plan using only courses present in input programs/generalEducation.
- Allowed placeholders ONLY:
  a) ELECTIVE placeholder (last resort):
     { "code":"ELECTIVE","title":"General Elective","credits":X,"fulfills":["Elective"] }, where X is 1-4.
  b) CHECKPOINT placeholder (only if gating text exists in input such as "Acceptance into the program", "Apply", "Admission required"):
     { "code":"CHECKPOINT","title":"Program Admission / Application","credits":0,"fulfills":[] }
- Do not create any other non-catalog courses or placeholders.

2) Total credits
- Use target_total_credits if provided; otherwise 120.
- Count historical Completed and In-Progress credits toward the total.
- After all non-elective requirements are satisfied, fill remaining credits using real catalog electives first; use ELECTIVE only if catalog electives are exhausted.

3) No duplicates
- No course code may appear more than once across takenCourses + planned terms, except explicit retakes required by minimum-grade policy.

4) Prerequisites / sequencing / envelopes
- Do not schedule a course before its prerequisites are satisfied by earlier Completed terms.
- Envelopes: all courses sharing envelopeId must be scheduled in the same planned term; move the whole envelope as a unit until all prerequisites for every course in the envelope are satisfied and the term can fit the full envelope within the term's credit bounds. Respect any envelope termsOffered/sequenceOrder constraints if provided.

FULFILLMENT TAGGING (must follow)
- Use fulfills strings exactly as provided in the input.
- For gen ed: use the exact bucket names from input.
- For program requirements: use exact requirement keys from input.
- If a requirement key matches requirement-* and lacks a program prefix, rewrite it as: "[{PROGRAM NAME}] requirement-*", using the official program name from input. Do not change already-prefixed keys and do not rewrite unrelated buckets.
- ELECTIVE placeholder uses fulfills ["Elective"].

WORKLOAD POLICY (soft constraints, apply after hard constraints)
- Use workStatus when provided:
  - full_time prefer lower end of term ranges
  - part_time prefer mid ranges
  - not_working can use upper ranges
  - variable keep near targets

DISTRIBUTION HEURISTICS (apply when ties exist)
- Spread gen ed across early planned terms (avoid all gen ed or all major early/late).
- Prefer upper-level (300+) electives later.
- Prefer pairing small-credit courses to avoid underloaded terms.
- Do not create a planned term composed only of ELECTIVE placeholders if unmet non-elective requirements remain.

OUTPUT DATA REQUIREMENTS
- Each output course object may include isCompleted:
  - isCompleted: true for historical Completed/passing courses.
  - isCompleted: false for In-Progress courses and all planned future courses.
- Preserve historical course objects and fulfills exactly as provided; only add isCompleted where allowed by schema.

Input:
{{INPUT_JSON}}
`;

const VALID_PHASES = new Set(['major_skeleton', 'gen_ed_fill', 'elective_balance']);

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      input,
      phase,
      promptName,
      model,
      max_output_tokens,
    } = body ?? {};

    if (!input || typeof input !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Input payload is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!phase || !VALID_PHASES.has(phase)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing phase' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const promptRecordName = typeof promptName === 'string' ? promptName : 'active_feedback_mode';
    const basePrompt = await GetAiPrompt(promptRecordName);
    let promptText = basePrompt || DEFAULT_ACTIVE_FEEDBACK_PROMPT;

    promptText = promptText.includes('{{PHASE}}')
      ? promptText.replace('{{PHASE}}', phase)
      : `${promptText}\n\nPHASE: ${phase}`;

    const serializedInput = JSON.stringify(input, null, 2);

    let exampleStructureJson: string | null = null;
    try {
      const examplePath = path.join(process.cwd(), 'config', 'prompts', 'example-format-byu-2024.json');
      exampleStructureJson = await fs.readFile(examplePath, 'utf-8');
    } catch (error) {
      console.warn('Warning: Could not read example-format-byu-2024.json:', error);
    }

    if (exampleStructureJson) {
      const examplePretty = exampleStructureJson.trim();
      promptText = promptText
        .replace(/\$\{JSON\.stringify\(exampleStructure,\s*null,\s*2\)\}/g, examplePretty)
        .replace(/\{\{EXAMPLE_STRUCTURE_JSON\}\}/g, examplePretty);
    }

    promptText = promptText
      .replace(/\$\{JSON\.stringify\(coursesData,\s*null,\s*2\)\}/g, serializedInput)
      .replace(/\{\{COURSES_DATA_JSON\}\}/g, serializedInput);

    if (promptText.includes('{{INPUT_JSON}}')) {
      promptText = promptText.replace('{{INPUT_JSON}}', serializedInput);
    } else if (!promptText.includes(serializedInput)) {
      promptText = `${promptText}\n\nINPUT_JSON:\n${serializedInput}`;
    }

    const resolvedModel = typeof model === 'string' ? model : 'gpt-5-mini';
    const isNewModel = resolvedModel.includes('gpt-5')
      || resolvedModel.includes('gpt-4.1')
      || resolvedModel.includes('o3')
      || resolvedModel.includes('o4');
    const maxTokensKey = isNewModel ? 'max_completion_tokens' : 'max_tokens';

    const requestBody: Record<string, unknown> = {
      model: resolvedModel,
      messages: [
        {
          role: 'user',
          content: promptText,
        },
      ],
      temperature: 1,
      stream: true,
    };

    requestBody[maxTokensKey] = typeof max_output_tokens === 'number' ? max_output_tokens : 18_000;

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
      return new Response(
        JSON.stringify({ error: `OpenAI request failed: ${errorText}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Active feedback streaming API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process active feedback request',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
